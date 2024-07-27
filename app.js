const express = require('express');
const app = express();
const axios = require('axios');
const port = 8080;
const mongoose = require('mongoose');
const { type } = require('os');
const path = require('path');


let url = "https://s3.amazonaws.com/roxiler.com/product_transaction.json";

app.use(express.static(path.join(__dirname, 'public')));

main().then((res) => {
    console.log("connected to DB");
}).catch((err) => {
    console.log("err");
});

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/roxilers');

}

const userSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
    },
    price: {
        type: Number,
    },
    description: {
        type: String,
    },
    category: {
        type: String
    },
    image: {
        type: String,
    },
    sold: {
        type: Boolean,
    },
    dateOfSale: {
        type: Date,
    }
});

const user = mongoose.model("User", userSchema);

async function getData() {
    try {
        let res = await axios.get(url);
        return res.data;
    } catch (e) {
        console.log(e);
        throw e;
    }
}

async function insertData(data) {
    try {
        await user.insertMany(data);
        console.log("Data inserted successfully");
    } catch (e) {
        console.log("Error inserting data:", e);
    }
}

app.get("/urlData", async (req, res) => {
    try {
        let data = await getData();
        await insertData(data); // Insert data into the database
        res.send(data);
    } catch (e) {
        res.status(500).send({ error: 'Something went wrong' });
    }
});

// API to list transactions with search and pagination
app.get("/transactions", async (req, res) => {
    try {
        console.log("Received request with parameters:", req.query);
        const { page = 1, perPage = 10, search = "", month = "" } = req.query;
        const searchRegex = new RegExp(search, 'i');
 
        let query = {};

        if (month) {
            query.dateOfSale = {
                $gte: new Date(`${new Date().getFullYear()}-${month}-01`),
                $lt: new Date(`${new Date().getFullYear()}-${month}-01`).setMonth(new Date().getMonth() + 1)
            };
        }

        if (search) {
            query = {
                ...query,
                $or: [
                    { title: searchRegex },
                    { description: searchRegex }
                ]
            };
        }

        const transactions = await user.find(query)
            .skip((page - 1) * perPage)
            .limit(parseInt(perPage));

        const totalTransactions = await user.countDocuments(query);

        res.json({
            transactions,
            totalPages: Math.ceil(totalTransactions / perPage),
            currentPage: parseInt(page),
            totalTransactions
        });
    } catch (e) {
        res.status(500).send({ error: 'Something went wrong' });
    }
});


// API for statistics by month
app.get("/statistics", async (req, res) => {
    try {
        const { month = "" } = req.query;

        if (!month) {
            return res.status(400).send({ error: 'Month parameter is required' });
        }

        const startDate = new Date(`${new Date().getFullYear()}-${month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        const totalSales = await user.aggregate([
            {
                $match: {
                    dateOfSale: { $gte: startDate, $lt: endDate },
                    sold: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$price" },
                    totalSold: { $sum: 1 }
                }
            }
        ]);

        const totalSoldItems = totalSales[0]?.totalSold || 0;
        const totalSaleAmount = totalSales[0]?.totalAmount || 0;

        const totalNotSoldItems = await user.countDocuments({
            dateOfSale: { $gte: startDate, $lt: endDate },
            sold: false
        });

        res.json({
            totalSaleAmount,
            totalSoldItems,
            totalNotSoldItems
        });
    } catch (e) {
        res.status(500).send({ error: 'Something went wrong' });
    }
});

// API for bar chart
app.get("/priceRanges", async (req, res) => {
    try {
        const { month = "" } = req.query;

        if (!month) {
            return res.status(400).send({ error: 'Month parameter is required' });
        }

        const startDate = new Date(`${new Date().getFullYear()}-${month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        const priceRanges = [
            { min: 0, max: 100 },
            { min: 101, max: 200 },
            { min: 201, max: 300 },
            { min: 301, max: 400 },
            { min: 401, max: 500 },
            { min: 501, max: 600 },
            { min: 601, max: 700 },
            { min: 701, max: 800 },
            { min: 801, max: 900 },
            { min: 901, max: Infinity }
        ];

        const priceRangeCounts = await Promise.all(priceRanges.map(async (range) => {
            const count = await user.countDocuments({
                dateOfSale: { $gte: startDate, $lt: endDate },
                price: { $gte: range.min, $lt: range.max }
            });
            return { range: `${range.min} - ${range.max}`, count };
        }));

        res.json(priceRangeCounts);
    } catch (e) {
        console.error('Error in /priceRanges:', e);
        res.status(500).send({ error: 'Something went wrong' });
    }
});


// API for pie chart
app.get("/categoryDistribution", async (req, res) => {
    try {
        const { month = "" } = req.query;

        if (!month) {
            return res.status(400).send({ error: 'Month parameter is required' });
        }

        const startDate = new Date(`${new Date().getFullYear()}-${month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        const categoryDistribution = await user.aggregate([
            {
                $match: {
                    dateOfSale: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(categoryDistribution);
    } catch (e) {
        res.status(500).send({ error: 'Something went wrong' });
    }
});

app.get("/combinedData", async (req, res) => {
    try {
        const { month = "" } = req.query;

        if (!month) {
            return res.status(400).send({ error: 'Month parameter is required' });
        }

        // Define the base URL for your APIs
        const baseUrl = `http://localhost:${port}`;

        // Fetch data from all three APIs concurrently
        const [transactionsResponse, priceRangesResponse, categoryDistributionResponse] = await Promise.all([
            axios.get(`${baseUrl}/transactions`, { params: { month } }),
            axios.get(`${baseUrl}/priceRanges`, { params: { month } }),
            axios.get(`${baseUrl}/categoryDistribution`, { params: { month } })
        ]);

        // Combine the results into a single response object
        const combinedData = {
            transactions: transactionsResponse.data,
            priceRanges: priceRangesResponse.data,
            categoryDistribution: categoryDistributionResponse.data
        };

        // Send the combined response
        res.json(combinedData);
    } catch (e) {
        console.error('Error fetching combined data:', e);
        res.status(500).send({ error: 'Something went wrong' });
    }
});
app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});