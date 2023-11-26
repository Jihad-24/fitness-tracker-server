const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const trainerCollection = client.db('FitnessTrackerDB').collection('trainers');
    const teacherCollection = client.db('FitnessTrackerDB').collection('teacher');
    const planCollection = client.db('FitnessTrackerDB').collection('plans');
    const paymentCollection = client.db('FitnessTrackerDB').collection('payments');
    const forumCollection = client.db('FitnessTrackerDB').collection('forums');
    const classCollection = client.db('FitnessTrackerDB').collection('classes');

    // classes api
    app.get('/classes',async(req,res)=>{
      const result=await classCollection.find().toArray();
      res.send(result);
    })

    app.post('/classes',async(req,res)=>{
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result);
    })

    // forum api
    app.get('/forums',async(req,res)=>{
      const result=await forumCollection.find().toArray();
      res.send(result);
    })

    app.post('/forums', async (req, res) => {
      const item = req.body;
      const result = await forumCollection.insertOne(item);
      res.send(result);
    })

    // trainer api
    app.get('/teacher', async (req, res) => {
      const result = await teacherCollection.find().toArray();
      res.send(result);
    })

    app.get('/trainers', async (req, res) => {
      const result = await trainerCollection.find().toArray();
      res.send(result);
    })

    app.post('/trainers', async (req, res) => {
      const data = req.body;
      const result = await trainerCollection.insertOne(data);
      res.send(result);
    })

    // plans api
    app.get('/plans', async (req, res) => {
      const result = await planCollection.find().toArray()
      res.send(result);
    })
    app.post('/plans', async (req, res) => {
      const data = req.body;
      const result = await planCollection.insertOne(data)
      res.send(result);
    })

    // subscribe api
    app.get('/subscribes', async (req, res) => {
      const result = await subscribeCollection.find().toArray();
      res.send(result);
    })

    app.post('/subscribes', async (req, res) => {
      const data = req.body;
      const result = await subscribeCollection.insertOne(data);
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
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/:email', async (req, res) => {
      const userEmail = req.params.email;
      const filter = { email: userEmail };
      const updateDoc = {
        $set: {
          role: 'trainer'
        }
      };

      try {
        const result = await userCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          await trainerCollection.deleteOne({ email: userEmail });

          res.send({ message: 'User role updated to trainer and removed from trainers collection.' });
        } else {
          res.status(404).send({ error: 'User not found.' });
        }
      } catch (error) {
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    // app.patch('/users/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       role: 'trainer'
    //     }
    //   }
    //   const result = await userCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // })

    // app.patch('/users/admin/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       role: 'admin'
    //     }
    //   }
    //   const result = await userCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })


    // payment intent api
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log('amount inside the intent', amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ["card"],
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email;
      const user = await paymentCollection.findOne({ email: email });
      res.send(user);
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

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