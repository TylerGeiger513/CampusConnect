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
        MongooseModule.forRoot('mongodb://localhost:27017/campusconnect_test'),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
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

  it('userB should see the friend request', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/friends/requests')
      .set('x-user-id', userBId)
      .expect(200);

    expect(res.body.friendRequests).toHaveLength(1);
    expect(res.body.friendRequests[0]).toHaveProperty('requester');
    expect(res.body.friendRequests[0].requester).toHaveProperty('username', 'userA');
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
