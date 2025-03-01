/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from './../src/auth/auth.module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import session from 'express-session';
import { AuthService } from '../src/auth/auth.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let cookieJar: string[] = [];
  let connection: Connection;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        // Use a dedicated test DB for auth tests.
        MongooseModule.forRoot('mongodb://localhost:27017/campusconnect_auth_test'),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Global validation pipe for DTO validation
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Session middleware.
    app.use(
      session({
        secret: 'testSecret',
        resave: false,
        saveUninitialized: false,
      }),
    );

    // Set global prefix to /api.
    app.setGlobalPrefix('api');

    await app.init();
    httpServer = app.getHttpServer();

    connection = moduleFixture.get(getConnectionToken());

    // Create a test user for login/profile/deletion tests.
    authService = moduleFixture.get(AuthService);
    // Ensure the test DB is clean.
    await connection.useDb('campusconnect_auth_test').dropDatabase();
    await authService.signup({ username: 'testuser', email: 'testuser@example.com', password: 'password123' });
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
    await app.close();
  });

  // --- Signup Edge Cases ---
  it('POST /auth/signup - fails when required fields are missing', async () => {
    // Missing email
    const response = await request(httpServer)
      .post('/api/auth/signup')
      .send({ username: 'user1', password: 'password123' })
      .expect(400);
    expect(response.body.message).toContain('email should not be empty');
  });

  it('POST /auth/signup - fails when email is invalid', async () => {
    const response = await request(httpServer)
      .post('/api/auth/signup')
      .send({ username: 'user1', email: 'invalid', password: 'password123' })
      .expect(400);
    expect(response.body.message).toContain('email must be an email');
  });

  it('POST /auth/signup - fails when password is too short', async () => {
    const response = await request(httpServer)
      .post('/api/auth/signup')
      .send({ username: 'user1', email: 'user1@example.com', password: '123' })
      .expect(400);
    expect(response.body.message).toContain('password must be longer than or equal to 6 characters');
  });

  it('POST /auth/signup - fails when duplicate user exists', async () => {
    // Create a user
    await request(httpServer)
      .post('/api/auth/signup')
      .send({ username: 'dupuser', email: 'dup@example.com', password: 'password123' })
      .expect(201);
    // Try signing up with same username or email.
    const response = await request(httpServer)
      .post('/api/auth/signup')
      .send({ username: 'dupuser', email: 'dup@example.com', password: 'password123' })
      .expect(409);
    expect(response.body.message).toContain('User already exists');
  });

  // --- Login Edge Cases ---
  it('POST /auth/login - fails when required fields are missing', async () => {
    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ password: 'password123' })
      .expect(400);
    expect(response.body.message).toContain('identifier should not be empty');
  });

  it('POST /auth/login - fails with incorrect credentials', async () => {
    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'testuser', password: 'wrong' })
      .expect(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  // --- Successful Login, Profile, Logout, Delete ---
  it('POST /auth/login - logs in successfully with correct password', async () => {
    // Clear any existing session.
    await request(httpServer).post('/api/auth/logout');

    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'testuser', password: 'password123' })
      .expect(200);
    expect(response.body.message).toBe('Logged in successfully');
    const setCookie = response.headers['set-cookie'];
    cookieJar = typeof setCookie === 'string' ? [setCookie] : setCookie ?? [];
  });

  it('GET /auth/profile - returns user info when logged in', async () => {
    const response = await request(httpServer)
      .get('/api/auth/profile')
      .set('Cookie', cookieJar)
      .expect(200);
    expect(response.body).toMatchObject({
      message: 'Profile retrieved',
      userId: expect.any(String),
    });
  });

  it('POST /auth/logout - logs out the user', async () => {
    const response = await request(httpServer)
      .post('/api/auth/logout')
      .set('Cookie', cookieJar)
      .expect(200);
    expect(response.body.message).toBe('Logged out successfully');
    cookieJar = [];
  });

  it('GET /auth/profile - returns "Not logged in" after logout', async () => {
    const response = await request(httpServer)
      .get('/api/auth/profile')
      .expect(200);
    expect(response.body.message).toBe('Not logged in');
  });

  it('POST /auth/login - logs in user again for deletion test', async () => {
    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'testuser', password: 'password123' })
      .expect(200);
    expect(response.body.message).toBe('Logged in successfully');
    const setCookie = response.headers['set-cookie'];
    cookieJar = typeof setCookie === 'string' ? [setCookie] : setCookie ?? [];
  });

  it('DELETE /auth/delete - deletes user successfully when logged in', async () => {
    const response = await request(httpServer)
      .delete('/api/auth/delete')
      .set('Cookie', cookieJar)
      .send({ password: 'password123' })
      .expect(200);
    expect(response.body.message).toBe('User deleted successfully');
  });

  it('GET /auth/profile - not logged in after user is deleted', async () => {
    const response = await request(httpServer)
      .get('/api/auth/profile')
      .set('Cookie', cookieJar)
      .expect(200);
    expect(response.body.message).toBe('Not logged in');
  });
});
