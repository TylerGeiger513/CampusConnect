/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ChatModule } from '../src/chat/chat.module';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { User } from '../src/auth/interfaces/user.interface';

describe('Chat E2E', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<User>;
  let channelModel: Model<any>;
  let messageModel: Model<any>;

  // Fixed ObjectIds for test users.
  const userAId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const userBId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const userCId = 'cccccccccccccccccccccccc'; // non-participant

  let channelId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ChatModule,
        // Use a dedicated test DB for chat tests.
        MongooseModule.forRoot('mongodb://localhost:27017/campusconnect_chat_test'),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    // Test authentication middleware.
    app.use((req, res, next) => {
      if (!req.session) {
        req.session = {};
      }
      if (req.headers['x-user-id']) {
        req.session.userId = req.headers['x-user-id'] as string;
      }
      next();
    });
    app.setGlobalPrefix('api');

    await app.init();

    connection = app.get(getConnectionToken());
    userModel = moduleFixture.get(getModelToken('User'));
    channelModel = moduleFixture.get(getModelToken('Channel'));
    messageModel = moduleFixture.get(getModelToken('Message'));

    // Clear the chat test DB and create test users.
    await connection.dropDatabase();
    await userModel.create([
      { _id: userAId, username: 'userA', email: 'userA@example.com', password: 'hashed', friends: [] },
      { _id: userBId, username: 'userB', email: 'userB@example.com', password: 'hashed', friends: [] },
      { _id: userCId, username: 'userC', email: 'userC@example.com', password: 'hashed', friends: [] },
    ]);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  // --- Channel Creation Edge Cases ---
  describe('Channel creation', () => {
    it('should fail when a user creates a channel with themselves', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/channel')
        .set('x-user-id', userAId)
        .send({ recipientId: userAId })
        .expect(400);
      expect(res.body.message).toBe('Cannot create a channel with yourself');
    });

    it('should fail when recipient does not exist', async () => {
      const nonExistentId = 'dddddddddddddddddddddddd';
      const res = await request(app.getHttpServer())
        .post('/api/chat/channel')
        .set('x-user-id', userAId)
        .send({ recipientId: nonExistentId })
        .expect(404);
      expect(res.body.message).toBe('Recipient user not found.');
    });

    it('should create (or retrieve) a direct channel between userA and userB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/channel')
        .set('x-user-id', userAId)
        .send({ recipientId: userBId })
        .expect(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.type).toBe('direct');
      expect(res.body.participants).toEqual(expect.arrayContaining([userAId, userBId]));
      channelId = res.body._id;
    });
  });

  // --- Message Sending & Retrieval Edge Cases ---
  describe('Message sending and retrieval', () => {
    it('should fail when sending a message to a non-existent channel', async () => {
      const nonExistentChannel = 'eeeeeeeeeeeeeeeeeeeeeeee';
      const res = await request(app.getHttpServer())
        .post('/api/chat/message')
        .set('x-user-id', userAId)
        .send({ channelId: nonExistentChannel, content: 'Test' })
        .expect(404);
      expect(res.body.message).toBe('Channel not found');
    });

    it('should fail when sending an empty message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/message')
        .set('x-user-id', userAId)
        .send({ channelId, content: '' })
        .expect(400);
      // Depending on your DTO/validation, adjust the error message.
      expect(res.body.message).toContain('content should not be empty');
    });

    it('should allow userA to send a message in the channel', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/message')
        .set('x-user-id', userAId)
        .send({ channelId, content: 'Hello, userB!' })
        .expect(201);
      expect(res.body.message).toBe('Message sent.');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.content).toBe('Hello, userB!');
    });

    it('should allow userB to send a message in the channel', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/message')
        .set('x-user-id', userBId)
        .send({ channelId, content: 'Hi, userA! How are you?' })
        .expect(201);
      expect(res.body.message).toBe('Message sent.');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.content).toBe('Hi, userA! How are you?');
    });

    it('should forbid a non-participant (userC) from sending a message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/message')
        .set('x-user-id', userCId)
        .send({ channelId, content: 'I should not be allowed!' })
        .expect(403);
      expect(res.body.message).toBe('Not authorized to send messages in this channel');
    });

    it('should retrieve all messages in the channel sorted chronologically', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/chat/channel/${channelId}/messages`)
        .set('x-user-id', userAId)
        .expect(200);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
      // Expect at least 2 messages from previous tests.
      expect(res.body.messages.length).toBeGreaterThanOrEqual(2);
      expect(res.body.messages[0].content).toBe('Hello, userB!');
      expect(res.body.messages[1].content).toBe('Hi, userA! How are you?');
    });
  });

  // --- Non-Authenticated Edge Cases ---
  it('should return 401 when non-authenticated user attempts to create a channel', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/chat/channel')
      .send({ recipientId: userBId })
      .expect(401);
    expect(res.body.message).toBe('Not authenticated');
  });

  it('should return 401 when non-authenticated user attempts to send a message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/chat/message')
      .send({ channelId, content: 'Test' })
      .expect(401);
    expect(res.body.message).toBe('Not authenticated');
  });

  it('should return 401 when non-authenticated user attempts to get messages', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/chat/channel/${channelId}/messages`)
      .expect(401);
    expect(res.body.message).toBe('Not authenticated');
  });
});
