const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// middilewares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8urwnno.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('FitnessTrackerDB').collection('users');
    const subscribeCollection = client.db('FitnessTrackerDB').collection('subscribes');

    // subscribe api
    app.post('/subscribes',async(req,res)=>{
        const data = req.body;
        const result= await subscribeCollection.insertOne(data);
        res.send(result);
    })

    // user api
    app.get('/users', async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      })

      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        res.send(user);
    });
  
      app.get('/users/admin/:email', async (req, res) => {
        const email = req?.params?.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbiddien access' })
        }
  
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === 'admin';
        }
        res.send({ admin });
      })
  
      app.post('/users', async (req, res) => {
        const user = req.body;
        // insert email if user doesen't exist
        // you can do this many ways (1. email unique, 2. upsert, 3. simple cheaking)
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exist', insertedId: null })
        }
  
        const result = await userCollection.insertOne(user);
        res.send(result);
      })
  
      app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'admin'
          }
        }
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      })
  
      app.delete('/users/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('FitnessTracker  in running')
  })
  
  app.listen(port, () => {
    console.log(`FitnessTracker  is on port ${port}`);
  })