/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { FriendsModule } from '../src/friends/friends.module';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { FriendRequest } from '../src/friends/interfaces/friend-request.interface';
import { User } from '../src/auth/interfaces/user.interface';

describe('Friends E2E', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<User>;
  let friendRequestModel: Model<FriendRequest>;

  const userAId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const userBId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        FriendsModule,
        // Use a dedicated test DB for friends tests.
        MongooseModule.forRoot('mongodb://localhost:27017/campusconnect_friends_test'),
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
    friendRequestModel = moduleFixture.get(getModelToken('FriendRequest'));

    await connection.dropDatabase();
    await userModel.create([
      {
        _id: userAId,
        username: 'userA',
        email: 'userA@example.com',
        password: 'hashed',
        friends: [],
      },
      {
        _id: userBId,
        username: 'userB',
        email: 'userB@example.com',
        password: 'hashed',
        friends: [],
      },
    ]);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  // --- Friend Request Edge Cases ---
  it('should fail when sending a friend request to self', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/friends/request')
      .set('x-user-id', userAId)
      .send({ recipient: userAId })
      .expect(400);
    expect(res.body.message).toBe('You cannot send a friend request to yourself.');
  });

  it('userA should send a friend request to userB', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/friends/request')
      .set('x-user-id', userAId)
      .send({ recipient: userBId })
      .expect(201);
    expect(res.body).toEqual({ message: 'Friend request sent successfully.' });
    const fr = await friendRequestModel.findOne({ requester: userAId, recipient: userBId });
    expect(fr).toBeDefined();
  });

  it('should fail when sending a duplicate friend request', async () => {
    // Attempt to send a second request.
    const res = await request(app.getHttpServer())
      .post('/api/friends/request')
      .set('x-user-id', userAId)
      .send({ recipient: userBId })
      .expect(400);
    expect(res.body.message).toBe('Friend request already sent.');
  });

  // --- Friend Request Viewing and Processing ---
  it('userB should see the friend request', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/friends/requests')
      .set('x-user-id', userBId)
      .expect(200);
    expect(res.body.friendRequests).toHaveLength(1);
    expect(res.body.friendRequests[0]).toHaveProperty('requester');
    expect(res.body.friendRequests[0].requester).toHaveProperty('username', 'userA');
  });

  it('should fail if a user tries to accept a request not addressed to them', async () => {
    // Create an extra user D for this test.
    const extraUserId = 'dddddddddddddddddddddddd';
    await userModel.create({
      _id: extraUserId,
      username: 'userD',
      email: 'userD@example.com',
      password: 'hashed',
      friends: [],
    });
    // userD attempts to accept userA->userB request.
    const fr = await friendRequestModel.findOne({ requester: userAId, recipient: userBId });
    const res = await request(app.getHttpServer())
      .post('/api/friends/accept')
      .set('x-user-id', extraUserId)
      .send({ requestId: (fr as any)._id.toString() })
      .expect(403);
    expect(res.body.message).toBe('You are not authorized to accept this friend request.');
  });

  it('userB should accept the friend request', async () => {
    const fr = await friendRequestModel.findOne({ requester: userAId, recipient: userBId });
    if (!fr) throw new Error('Friend request not found');
    const res = await request(app.getHttpServer())
      .post('/api/friends/accept')
      .set('x-user-id', userBId)
      .send({ requestId: (fr as any)._id.toString() })
      .expect(201);
    expect(res.body).toEqual({ message: 'Friend request accepted.' });
    const frAfter = await friendRequestModel.findOne({ requester: userAId, recipient: userBId });
    expect(frAfter).toBeNull();

    const userA = await userModel.findById(userAId);
    const userB = await userModel.findById(userBId);
    expect(userA?.friends?.map(String) ?? []).toContain(userBId);
    expect(userB?.friends?.map(String) ?? []).toContain(userAId);
  });

  it('should fail to revoke a friend request not initiated by the user', async () => {
    // Create a friend request from userA to userB again (simulate a duplicate scenario)
    const newFR = new friendRequestModel({ requester: userAId, recipient: userBId });
    await newFR.save();
    // userB attempts to revoke it.
    const res = await request(app.getHttpServer())
      .post('/api/friends/revoke')
      .set('x-user-id', userBId)
      .send({ requestId: (newFR as any)._id.toString() })
      .expect(403);
    expect(res.body.message).toBe('You are not authorized to revoke this friend request.');
  });

  it('userA should revoke their friend request successfully', async () => {
    const fr = await friendRequestModel.findOne({ requester: userAId, recipient: userBId });
    if (!fr) throw new Error('Friend request not found for revocation');
    const res = await request(app.getHttpServer())
      .post('/api/friends/revoke')
      .set('x-user-id', userAId)
      .send({ requestId: (fr as any)._id.toString() })
      .expect(200);
    expect(res.body.message).toBe('Friend request revoked.');
  });

  it('userA should remove userB from the friend list', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/friends/remove')
      .set('x-user-id', userAId)
      .send({ friendId: userBId })
      .expect(201);
    expect(res.body).toEqual({ message: 'Friend removed successfully.' });
    const userA = await userModel.findById(userAId);
    const userB = await userModel.findById(userBId);
    expect(userA?.friends?.map(String) ?? []).not.toContain(userBId);
    expect(userB?.friends?.map(String) ?? []).not.toContain(userAId);
  });
});
