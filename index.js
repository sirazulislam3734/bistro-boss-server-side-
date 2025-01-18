const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(
  "sk_test_51QhXo5HyC1sVDy6K77j7FSon6bpAHDNR5bKGGP1lvwD3ssZxcpcrmjBENkASRGaAKzV70gqIDFH6kNXqbZtJCOPv00TsQOw4Fy"
);
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://BossUser:xpz6IZZy3aCI7rpd@cluster0.jkpu6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("BossDB").collection("users");
    const menusCollection = client.db("BossDB").collection("menu");
    const reviewsCollection = client.db("BossDB").collection("reviews");
    const cardsCollection = client.db("BossDB").collection("cards");
    const paymentsCollection = client.db("BossDB").collection("payments");

    // JWT Authentication API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, "asdfghjkl1234567890", {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // middle aware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send("Forbidden Access");
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, "asdfghjkl1234567890", (err, decoded) => {
        if (err) return res.status(403).send("Invalid or Expired Token");
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verify Token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send("forbidden access");
      }
      next();
    };

    // User API
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.status(409).send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //  Menu API
    app.get("/menu", async (req, res) => {
      const result = await menusCollection.find().toArray();
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menusCollection.findOne(query);
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const menuITem = req.body;
      const result = await menusCollection.insertOne(menuITem);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: req.body.name,
          price: req.body.price,
          image: req.body.image,
          recipe: req.body.recipe,
          category: req.body.category,
        },
      };
      const result = await menusCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menusCollection.deleteOne(query);
      res.send(result);
    });

    //  Reviews API
    app.get("/review", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    //  Cards API
    app.get("/cards", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cardsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/cards", async (req, res) => {
      const cardITem = req.body;
      const result = await cardsCollection.insertOne(cardITem);
      res.send(result);
    });

    app.delete("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cardsCollection.deleteOne(query);
      res.send(result);
    });

    // Payment intent
    app.get('/payments/:email',verifyToken, async (req, res) => {
      const query = {email: req.params.email};
      if( req.params.email !== req.decoded.email){
        return res.status(401).send({message: 'Unauthorized'});
      }
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log("Price", price);
      const amount = parseInt(price * 100);
      console.log("Amount", amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      // console.log("Payment", payment);
      // carefully delete each item from the card
      const query = {
        _id: {
          $in: payment.cardIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = cardsCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
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
  res.send("Hello bistro-boss-restaurant!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
