const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.hrq6pyr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => res.send("DL Airbnb Server running horse"));

async function run() {
  try {
    await client.connect();
    const db = client.db("dlAirbnb");
    const itemsCollection = db.collection("items");

    app.get("/items", async (req, res) => {
      let query = {};

      // grabbing values from req.query
      const category = req.query.category;
      const placeType = req.query.placeType;
      const maxPrice = req.query.maxPrice;
      const minPrice = req.query.minPrice;
      const bedrooms = req.query.bedrooms;
      const beds = req.query.beds;
      const bathrooms = req.query.bathrooms;
      const propertyTypes = req.query.propertyTypes;
      const amenities = req.query.amenities;
      const accessibilities = req.query.accessibilities;
      const languages = req.query.languages;

      // checking if value exists, if exists then passing it to query;
      if (category) query.category = category;
      if (placeType) query.placeType = placeType;
      if (beds) query.beds = parseInt(beds);
      if (bedrooms) query.bedrooms = parseInt(bedrooms);
      if (bathrooms) query.bathrooms = parseInt(bathrooms);
      if (maxPrice && minPrice)
        query.pricePerNight = {
          $gte: parseInt(minPrice),
          $lte: parseInt(maxPrice),
        };
      if (propertyTypes) {
        const propertyTypesArr = propertyTypes.split(",");
        query.propertyType = { $in: propertyTypesArr };
      }
      if (amenities) {
        const amenitiesArr = amenities.split(",");
        query.amenities = { $all: amenitiesArr };
      }
      if (accessibilities) {
        const accessibilitiesArr = accessibilities.split(",");
        query.accessibilities = { $all: accessibilitiesArr };
      }
      if (languages) {
        const languagesArr = languages.split(",");
        query["host.language"] = { $in: languagesArr };
      }

      const result = await itemsCollection.find(query).toArray();
      res.send(result);
    });


    app.get("/search", async (req, res) => {
      const query = {};
      const location = req.query.location;
      const checkIn = req.query.checkIn;
      const checkOut = req.query.checkOut;
      const maxAdults = req.query.maxAdults;
      const maxChildren = req.query.maxChildren;

      if (location) {
        const locationWords = location.split(" ");

        // Create a regular expression pattern to match any of the location words
        const regexPattern = locationWords
          .map((word) => `\\b${word}\\b`)
          .join("|");
        const regex = new RegExp(regexPattern, "i"); // 'i' for case-insensitive search

        // Create the query to find items with location matching the regex
        query.location = { $regex: regex };
      }
      if (checkIn || checkOut) {
        query.$or = [
          { bookedDates: { $exists: false } }, // Items with no bookings
          {
            bookedDates: {
              $not: {
                $elemMatch: {
                  checkIn: checkIn ? { $lte: checkIn } : {},
                  checkOut: checkOut ? { $gte: checkOut } : {},
                },
              },
            },
          },
        ];
      }
      if (parseInt(maxAdults) && maxAdults !== "undefined")
        query.maxAdults = parseInt(maxAdults);
      if (parseInt(maxChildren) && maxChildren !== "undefined")
        query.maxChildren = { $lte: parseInt(maxChildren) };


      const result = await itemsCollection.find(query).toArray();
      res.send(result);
    });
  } catch (e) {
    console.log(e.message);
  }
}


run();
app.listen(port);
