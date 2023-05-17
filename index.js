const express = require("express");
const cors = require("cors");
let jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//mongodb password & userId hidden  for user dotenv
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_Pass}@cluster0.4aqqhbm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify for user token and access
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  // jodi user er token na thake
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unAuthorized access " });
  }
  const token = authorization.split(" ")[1];
  // console.log("token inside ", token);

  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_JWT, function (error, decoded) {

    if(error){
      return res.status(403).send({error:true,message:'unAuthorized access '})
    }
    req.decoded=decoded
    next()
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctors").collection("services");

    const bookingServiceCollection = client
      .db("carDoctors")
      .collection("bookings");

    // jwt token  routes
    app.post("/jwt-token", (req, res) => {
      const user = req.body;

      const token = jwt.sign(
        // user: user,
        user,
        process.env.ACCESS_TOKEN_SECRET_JWT,
        { expiresIn: '1h' }
      );

      res.send({ token });
    });

    // services routes

    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    // bookings routes

    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded=req.decoded
      console.log("cam back  after verify ",decoded)

      // email jar token tar hote hobe  and token er validation ses hoile
      if(decoded.email!==req.query.email){
        return res.status(403).send({error:1,message:'forbidden access '})
      }

      // single user er services booking niye aste hobe
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await bookingServiceCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const serviceBooking = req.body;
      const result = await bookingServiceCollection.insertOne(serviceBooking);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updateBooking = req.body;
      // const options = { upsert: true };
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: updateBooking.status,
        },
      };

      const result = await bookingServiceCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingServiceCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor server is running ");
});

app.listen(port, () => {
  console.log(`car doctor server is running on port ${port}`);
});
