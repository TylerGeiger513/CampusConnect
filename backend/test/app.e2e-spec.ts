/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from './../src/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose'; // << Important
import { Connection } from 'mongoose';                // << Important
import session from 'express-session';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  // We'll store cookies here so that subsequent tests can reuse the session
  let cookieJar: string[] = [];

  // This will reference the same Mongoose connection that NestJS creates
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        // Connect to a dedicated test DB
        MongooseModule.forRoot('mongodb://localhost:27017/campusconnect_test'),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Add session middleware for e2e tests
    app.use(
      session({
        secret: 'testSecret', // for local testing only
        resave: false,
        saveUninitialized: false,
      }),
    );

    await app.init();
    httpServer = app.getHttpServer();


    // Retrieve the NestJS-managed connection so we can drop the DB later
    const connectionToken = getConnectionToken(); // typically 'DatabaseConnection'
    connection = moduleFixture.get<Connection>(connectionToken);

    // Drop the entire test database so it's fresh for this run
    await connection
      .useDb('campusconnect_test')
      .dropDatabase();

  });

  afterAll(async () => {
    // Drop the entire test database so it's fresh for next run
    // ...only do this if you truly want to wipe out that DB each time
    await connection.dropDatabase();  // <<-- Now on the instance, not the class
    await connection.close();
    await app.close();
  });

  /********************************************************************************
   * SIGNUP
   ********************************************************************************/
  it('POST /auth/signup - creates a new user', async () => {
    const response = await request(httpServer)
      .post('/auth/signup')
      .send({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('userId');
  });

  /********************************************************************************
   * LOGIN (WRONG PASSWORD) - should fail
   ********************************************************************************/
  it('POST /auth/login - fails on incorrect password', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send({ identifier: 'testuser', password: 'incorrectPassword' })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  /********************************************************************************
   * LOGIN (CORRECT PASSWORD)
   ********************************************************************************/
  it('POST /auth/login - logs in successfully with correct password', async () => {
    // Log out if there's any previous session
    await request(httpServer).post('/auth/logout');

    const response = await request(httpServer)
      .post('/auth/login')
      .send({ identifier: 'testuser', password: 'password123' })
      .expect(200);

    expect(response.body.message).toBe('Logged in successfully');

    // Safely store the set-cookie header as an array of strings
    const setCookie = response.headers['set-cookie'];
    if (typeof setCookie === 'string') {
      cookieJar = [setCookie];
    } else {
      cookieJar = setCookie ?? [];
    }
  });

  /********************************************************************************
   * PROFILE (LOGGED IN)
   ********************************************************************************/
  it('GET /auth/profile - returns user info when logged in', async () => {
    const response = await request(httpServer)
      .get('/auth/profile')
      .set('Cookie', cookieJar)
      .expect(200);

    expect(response.body).toMatchObject({
      message: 'Profile retrieved',
      userId: expect.any(String),
    });
  });

  /********************************************************************************
   * LOGOUT
   ********************************************************************************/
  it('POST /auth/logout - logs out the user', async () => {
    const response = await request(httpServer)
      .post('/auth/logout')
      .set('Cookie', cookieJar)
      .expect(200);

    expect(response.body.message).toBe('Logged out successfully');

    // clear our local copy of the cookie
    cookieJar = [];
  });

  /********************************************************************************
   * PROFILE (LOGGED OUT)
   ********************************************************************************/
  it('GET /auth/profile - returns "Not logged in" after logout', async () => {
    // We have no valid cookie now
    const response = await request(httpServer)
      .get('/auth/profile')
      .expect(200);

    expect(response.body.message).toBe('Not logged in');
  });

  /********************************************************************************
   * LOGIN AGAIN FOR DELETE
   ********************************************************************************/
  it('POST /auth/login - logs in user again for deletion test', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send({ identifier: 'testuser', password: 'password123' })
      .expect(200);

    expect(response.body.message).toBe('Logged in successfully');

    const setCookie = response.headers['set-cookie'];
    if (typeof setCookie === 'string') {
      cookieJar = [setCookie];
    } else {
      cookieJar = setCookie ?? [];
    }
  });

  /********************************************************************************
   * DELETE USER
   ********************************************************************************/
  it('DELETE /auth/delete - deletes user successfully when logged in', async () => {
    const response = await request(httpServer)
      .delete('/auth/delete')
      .set('Cookie', cookieJar)
      .send({ password: 'password123' })
      .expect(200);

    expect(response.body.message).toBe('User deleted successfully');
  });

  /********************************************************************************
   * PROFILE AFTER DELETION
   ********************************************************************************/
  it('GET /auth/profile - not logged in after user is deleted', async () => {
    // even if we pass old cookie, user is presumably gone
    const response = await request(httpServer)
      .get('/auth/profile')
      .set('Cookie', cookieJar)
      .expect(200);

    expect(response.body.message).toBe('Not logged in');
  });
});
