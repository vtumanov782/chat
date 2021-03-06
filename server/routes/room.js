import express from "express";
import { getDB } from "../database";
import { ObjectID } from "mongodb";
const room = express.Router();

room.get("/", async (req, res) => {
  console.log('route: /');
  const {q: query=''} = req.query;
  const filterQuery = {};
  const queryOptions = {};
  if (query) {
    filterQuery['$text'] = {$search: query};
    queryOptions.projection = {
      score: {$meta: 'textScore'}
    };
    queryOptions.sort = {
      score: {$meta: 'textScore'}
    };
  }

  const db = getDB();
  const rooms = await db.collection("rooms").find(filterQuery, queryOptions);
  res.json(await rooms.toArray());
});

room.get("/mine", async (req, res) => {
  //get list of rooms, of which current user is member
  const db = getDB();
  const rooms = db.collection('rooms');
  const users = db.collection('users');
  const user = await users.findOne({_id: ObjectID(req.user)});
  const usersRoomsIds = user.memberOfRooms || [];

  if (!usersRoomsIds.length) {
    return res.json([]);
  }
  
  const usersRoomsObjectIds = usersRoomsIds.map(usersRoomId => ObjectID(usersRoomId));
  const usersRooms = await rooms.find({_id: {$in: usersRoomsObjectIds}});
  res.json(await usersRooms.toArray());
});

room.get("/:id", async (req, res) => {
  const db = getDB();
  const rooms = db.collection('rooms');
  const {id} = req.params;
  const room = await rooms.findOne({_id: ObjectID(id)});
  room['members'] = room['members'] || [];
  room['isMember'] = room['members'].includes(req.user);
  res.json(room);
});

room.post("/join/:id", async (req, res) => {
  const db = getDB();
  const rooms = db.collection('rooms');
  const users = db.collection('users');
  const roomId = req.params.id;
  const userId = req.user;

  rooms.updateOne({_id: ObjectID(roomId)}, {
    $addToSet: {members: userId}
  });
  users.updateOne({_id: ObjectID(userId)}, {
    $addToSet: {memberOfRooms: roomId}
  });
  res.json({
    isMember: true
  }).end();
});

room.put("/", async (req, res) => {
  const db = getDB();
  const room = db.collection("rooms");
  const { name, password } = req.body;
  const authorId = new ObjectID(req.user);
  await room.insertOne({ name, password, authorId });
  res.status(200).end();
});

room.post("/:id", async (req, res) => {
  const db = getDB();
  const room = db.collection("rooms");
  const { name } = req.body;
  const { id } = req.params;
  await room.findOneAndUpdate(
    { _id: ObjectID(id) },
    {
      $set: {
        name
      }
    }
  );

  res.status(200).end();
});

export default room;
