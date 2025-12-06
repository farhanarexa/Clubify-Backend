require('dotenv').config();
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

//db user & Passwo
// SimpleDBuser
//TGKmQLKBh8kz6MT6

function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.scnhrfl.mongodb.net/?appName=${capitalize(process.env.DB_CLUSTER)}`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get("/", (req, res) => {
    res.send("Gu Khabi Guu????? guuu guuu guuuuuuuuuuu?????? kha kha kha gu gile gile kha... gu chuishe chuishe khaaaaaa....");
});

async function run() {
  try {
    // Connect the client to the server	
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("Clubify").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
}); 