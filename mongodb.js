const express = require ("express")
const app = express()
const mongoose = require ("mongoose")

 mongoose.connect("mongodb+srv://kenzphilip:tunechi@cluster0.jnypfmp.mongodb.net/?retryWrites=true&w=majority",  { useNewUrlParser: true, useUnifiedTopology: true }) 

.then ( () => {
    mongoose.connection.setMaxListeners(20);
    console.log("mongodb connected");
})
.catch(() => {
    console.log("failed to connect");
})



const UserSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true,
        index: true
    },
    middle_name: {
        type: String,
        required: true,
        index: true 
    },
    last_name: {
        type: String,
        required: true,
        index: true
    },
    address: {
        type: String,
        required: true,
        index: true
    },
    city: {
        type: String,
        required: true,
        index: true
    },
    state: {
        type: String,
        required: true,
        index: true
    },
    zipcode: {
        type: String,
        required: true,
        index: true
    },
    nationality: {
        type: String,
        required: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    dob: {
        type: String,
        required: true,
        index: true
    },
    gender: {
        type: String,
        required: true,
        index: true
    },
    employstatus: {
        type: String,
        required: true,
        index: true
    },
    accttype: {
        type: String,
        required: true,
        index: true
    },
    currency: {
        type: String,
        required: true,
        index: true
    },
    pinnumber: {
        type: String,
        required: true,
        index: true
    },
    accountNumber: {
        type: String,
        required: true,
        index: true
    },
    balance: {
        type: Number,
        default: 0.00,
        required: true,
        index: true
    },
    taxNumber: {
        type: String,
        required: true,
        index: true
    },
    aptNumber: {
        type: String,
        required: true,
        index: true
    },
    nrtNumber: {
        type: String,
        required: true,
        index: true
    },
    routingNumber: {
        type: String,
        required: true,
        index: true
    },
    password: {
        type: String,
        required: true,
        index: true
    },
    nokname: {
        type: String,
        required: true,
        index: true
    },
    nokaddress: {
        type: String,
        required: true,
        index: true
    },
    nokrelationship: {
        type: String,
        required: true,
        index: true
    },
    nokphone: {
        type: String,
        required: true,
        index: true
    },
    nokemail: {
        type: String,
        required: true,
        index: true
    },
    transactionHistory: {
        type: Array,
        default: [],
    },
})

const transactionSchema = new mongoose.Schema({
    dateTime: String,
    type: String, // 'Debit' or 'Credit'
    description: String,
    amount: Number,
    balance: Number,
});

const collection = new mongoose.model("Collection", UserSchema)
const Transaction = new mongoose.model("Transaction", transactionSchema)


// try {
//      collection.createIndexes([
//       { key: { accountNumber: 1 } },
//       { key: { taxNumber: 1 } },
//       { key: { aptNumber: 1 } },
//       { key: { routingNumber: 1 } },
//       { key: { pinnumber: 1 } }
//       // Add other index definitions here
//     ]);
//     console.log("Indexes created successfully");
//   } catch (err) {
//     console.error("Error creating indexes:", err);
//   }

  module.exports = {
    collection,
    Transaction,
  }







// module.exports=collection