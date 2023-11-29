const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5001;
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
  

    const userCollection = client.db('FitnessTrackerDB').collection('users');
    const subscribeCollection = client.db('FitnessTrackerDB').collection('subscribes');
    const trainerCollection = client.db('FitnessTrackerDB').collection('trainers');
    const teacherCollection = client.db('FitnessTrackerDB').collection('teacher');
    const planCollection = client.db('FitnessTrackerDB').collection('plans');
    const paymentCollection = client.db('FitnessTrackerDB').collection('payments');
    const forumCollection = client.db('FitnessTrackerDB').collection('forums');
    const classCollection = client.db('FitnessTrackerDB').collection('classes');
    const teamCollection = client.db('FitnessTrackerDB').collection('teams');


      // jwt token api
      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
        res.send({ token });
      })
  
      // middlewares
      const verifyToken = (req, res, next) => {
        // console.log("inside verify token", req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
      }
  
      // use verify admin after verifytoken
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbiddien access' })
        }
        next();
      }


    // teams api
    app.get('/teams', async (req, res) => {
      const result = await teamCollection.find().toArray();
      res.send(result);
    })
    // classes api
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.post('/classes',verifyToken,  async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item);
      res.send(result);
    })

    // forum api
   
    app.get('/forums', async (req, res) => {
      const page =Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;
      const result = await forumCollection.find().skip(skip).limit(limit).toArray();
      const totalForums = await forumCollection.estimatedDocumentCount();
      res.send({result, totalForums});
    })
   
    app.post('/forums',verifyToken,  async (req, res) => {
      const item = req.body;
      const result = await forumCollection.insertOne(item);
      res.send(result);
    })

      app.post('/forums/:id/upvote', async (req, res) => {
        const forumId = req.params.id;
        try {
            const result = await forumCollection.updateOne(
                { _id: new ObjectId(forumId) },
                { $inc: { upVotes: 1 } }
            );
            res.send(result);
        } catch (error) {
            console.error('Error up-voting:', error);
            res.status(500).send('Error up-voting');
        }
    });

    app.post('/forums/:id/downvote', async (req, res) => {
        const forumId = req.params.id;
        try {
            const result = await forumCollection.updateOne(
                { _id: new ObjectId(forumId) },
                { $inc: { downVotes: 1 } }
            );
            res.send(result);
        } catch (error) {
            console.error('Error down-voting:', error);
            res.status(500).send('Error down-voting');
        }
    });

    app.get('/forums/:id', async (req, res) => {
      const forumId = req.params.id;
      try {
        const result = await forumCollection.findOne({ _id: new ObjectId(forumId) });

        res.send(result);
      } catch (error) {
        console.error('Error fetching forum post:', error);
        res.status(500).send('Error fetching forum post');
      }
    });
    
// teacher api
    app.get('/teacher', async (req, res) => {
      const result = await teacherCollection.find().toArray();
      res.send(result);
    })

    app.put('/teacher/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'paid'
        }
      };
        const result = await teacherCollection.updateOne(filter, updateDoc);
        res.send(result)
    })

    // trainer api
    app.get('/trainers', async (req, res) => {
      const result = await trainerCollection.find().toArray();
      res.send(result);
    })

    app.post('/trainers',verifyToken, async (req, res) => {
      const data = req.body;
      const result = await trainerCollection.insertOne(data);
      res.send(result);
    })

    // plans api
    app.get('/plans', async (req, res) => {
      const result = await planCollection.find().toArray()
      res.send(result);
    })
    app.post('/plans',verifyToken, async (req, res) => {
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
    app.get('/users',verifyToken,  async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: id}
      const result = await userCollection.findOne(query)
      res.send(result);
    })

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query ={email: email}
      console.log(query);
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get('/users/admin/:email',verifyToken, async (req, res) => {
      const email = req?.params?.email;
      // console.log(email);
      // console.log(req.decoded.email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbiddien access' })
      }
      const query = { email: email };
      // console.log(query);
      const user = await userCollection.findOne(query);
      // console.log(user);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.get('/users/trainer/:email',verifyToken, async (req, res) => {
      const email = req?.params?.email;
      // console.log(email);
      // console.log(req.decoded.email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbiddien access' })
      }
      const query = { email: email };
      // console.log(query);
      const user = await userCollection.findOne(query);
      // console.log(user);
      let trainer = false;
      if (user) {
        trainer = user?.role === 'trainer';
      }
      res.send({ trainer });
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

    app.put('/user/:id', async (req, res) => {
      const userId = req.params.id;
      // console.log(userId);
      const { name, image } = req.body;
      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(userId) }, 
          { $set: { name, image } }, 
        );
        // console.log(result);
        res.send(result);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.patch('/users/:email',verifyToken, verifyAdmin, async (req, res) => {
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

    app.get('/payments/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = await paymentCollection.findOne({ email: email });
      res.send(user);
    });

    app.get('/payments',async(req,res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

  
  } finally {
  
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('FitnessTracker  in running')
})

app.listen(port, () => {
  console.log(`FitnessTracker  is on port ${port}`);
})