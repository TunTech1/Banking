if (process.env.NODE_ENV !== "production") {
    require("dotenv").config()
}



// Importing libraries that we installed using npm
const express = require ("express");
const ejs = require ("ejs");
const path = require ("path");
const bodyParser = require ("body-parser");
const app = express();
const bcrypt = require("bcrypt");
const passport = require("passport");
const initializePassport = require("./passport-config");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const { collection, Transaction, Image } = require("./mongodb");
const mongoose = require("mongoose");
const mongoURI = process.env.MONGODB_URI;
const multer = require("multer");  
const port = process.env.PORT || 3000;

initializePassport(
    passport, 
    email => collection.findOne({ email }), // Modify to find user by email in MongoDB
    id => collection.findOne({ _id: id }) // Modify to find user by _id in MongoDB
)





const users = []
const wires = []
const taxs = []
const apts = []
const nrts = []

function generateRandomNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000);
}

function generateTaxNumber() {
    return Math.floor(1000 + Math.random() * 9000);
}

function generateAptNumber() {
    return Math.floor(1000 + Math.random() * 9000);
}

function generateNrtNumber() {
    return Math.floor(1000 + Math.random() * 9000);
}

function generateRoutingNumber() {
    return Math.floor(10000000 + Math.random() * 90000000);
}



function setUpChangeStream() {
    const collection = mongoose.model('Collection');

    const changeStream = collection.watch();

    changeStream.on('change', (change) => {
        // Log the change to the console for debugging
        console.log('Change Detected:', change);
    });

    changeStream.on('error', (error) => {
        console.error('Change Stream Error:', error);
    }); 
}

// Start the change stream when the application starts
setUpChangeStream();


app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));

app.use(express.static('./monumental'));
app.use(express.static('./dash'));



// const fileStorageEngine = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, './monumental/assets/image')
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + "--" + file.originalname);
//     },
// });

// const upload = multer({storage: fileStorageEngine});
// let uploadedImage = ''; // Declare uploadedImage in a higher scope

const storage = multer.memoryStorage()

const upload = multer({storage:storage})




// Configuring the register post functionality
app.post("/login", checkNotAuthenticated, passport.authenticate("local", {
    successRedirect: "/index",
    failureRedirect: "/login",
    failureFlash: true
}))

// Configuring the register post functionality
app.post("/register", checkNotAuthenticated, async (req, res) => {

    try {
        const randomAccountNumber = generateRandomNumber(req.body.accountNumber)
        const randomTaxNumber = generateTaxNumber(req.body.taxNumber)
        const randomAptNumber = generateAptNumber(req.body.aptNumber)
        const randomNrtNumber = generateNrtNumber(req.body.nrtNumber)
        const randomRoutingNumber = generateRoutingNumber(req.body.routingNumber)
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const pinnumber = req.body.pinnumber;
        const initialBalance = 0.00;
        const user = ({
            // id: Date.now().toString(),
            first_name: req.body.first_name,
            middle_name: req.body.middle_name,
            last_name: req.body.last_name,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            zipcode: req.body.zipcode,
            nationality: req.body.nationality,
            phone: req.body.phone,
            email: req.body.email,
            dob: req.body.dob,
            gender: req.body.gender,
            employstatus: req.body.employstatus,
            accttype: req.body.accttype,
            currency: req.body.currency,
            pinnumber: pinnumber,
            accountNumber: randomAccountNumber,
            taxNumber: randomTaxNumber,
            aptNumber: randomAptNumber,
            nrtNumber: randomNrtNumber,
            routingNumber: randomRoutingNumber,
            balance: initialBalance,
            password: hashedPassword,
            nokname: req.body.nokname,
            nokaddress: req.body.nokaddress,
            nokrelationship: req.body.nokrelationship,
            nokphone: req.body.nokphone,
            nokemail: req.body.nokemail,
        })
        await collection.create([user])
        users.push(user);
        console.log(user);
        res.redirect("/login")

    } catch (e) {
        console.log(e);
        res.redirect("/register")

    }
});


async function authenticateUser(accountNumber) {
  try {
    const user = await collection.findOne({ accountNumber });
    return user || null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }  
}

async function findReceiverByAccountNumber(accountNumber) {
    try {
      const receiver = await collection.findOne({ accountNumber });
      return receiver || null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }  
  }






 async function addTransaction(user, type, description, amount) {

    const optionsDate = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };

    const optionsTime = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };

    const datePart = new Date().toLocaleDateString('en-US', optionsDate);
    const timePart = new Date().toLocaleTimeString('en-US', optionsTime);


    const transactionData = {
        dateTime: `${datePart} ${timePart}`,
        type: type, // 'Debit' or 'Credit'
        description: description,
        amount: amount,
        balance: user.balance,
    };

    if (!user.transactionHistory) {
        user.transactionHistory = [];
    }

    try {
        // Create a new transaction document and save it to the database
        const transaction = await Transaction.create(transactionData);

        // Add the transaction reference to the user's transactionHistory
        user.transactionHistory.push(transaction);

        // Save the updated user object with the new transaction reference
        await user.save();

        return transaction;
    } catch (error) { 
        console.error('Error adding transaction:', error);
        throw error;
    }

}
module.exports = addTransaction;



app.post("/domestic", async (req, res) => {

        const { senderAccountNumber, receiverAccountNumber, amount } = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const sender = await authenticateUser(senderAccountNumber,);

            if (!sender) {
            // return res.status(401).json({ error: 'Authentication failed' });
            req.flash('error', 'Authentication failed');
            res.redirect('/domestic')
            }

            const receiver = await collection.findOne({ accountNumber: receiverAccountNumber });

            if (!receiver) {
                req.flash('error', 'Invalid receiver account number');
                return res.redirect('/domestic')
            }

        console.log('Updated Sender:', sender);

         // Log sender's balance and transfer amount for debugging
        console.log('Sender balance:', sender.balance);
        console.log('Transfer amount:', amount);


        // Check if the sender has sufficient balance
        if (sender.balance < amount) {
            req.flash('error', 'Insufficient Funds');
            return res.redirect('/domestic')
        }

        // Deduct the transfer amount from the sender's balance
        sender.balance -= amount;


       // Add the transfer amount to the receiver's balance
    //    receiverBalance += amount;


        await sender.save();
        // await receiver.save();


        // Construct the sender's transaction description
        const senderTransactionDescription = `Fund transfer of $${amount}. to ${receiver.accountNumber}`;

        // Construct the receiver's transaction description
        const receiverTransactionDescription = `Received from $${sender.accountNumber}`;


        await addTransaction(sender, 'Debit', senderTransactionDescription, amount);

        // Add a Credit transaction to receiver's history
        await addTransaction(receiver, 'Credit', receiverTransactionDescription, amount);


        req.flash('success', 'Transaction successful');
        return res.redirect('/domestic')

    } catch (e) {
        console.error(e);
        return res.json({ error: 'An error occurred' });
    }

});

app.post('/local', async (req, res) => {
    
        const { bank, accttype, senderAccountNumber, receiverAccountNumber, amount, pinnumber } = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();

    try {

        const sender = await authenticateUser(senderAccountNumber,);

        if (!sender) {
        req.flash('error', 'Authentication failed');
        res.redirect('/local')
        }


        const receiver = await collection.findOne({ accountNumber: receiverAccountNumber });

        if (!receiver) {
            req.flash('error', 'Invalid receiver account number');
            return res.redirect('/local')

        }

        console.log('Updated Sender:', sender);

         // Log sender's balance and transfer amount for debugging
        console.log('Sender balance:', sender.balance);
        console.log('Transfer amount:', amount);


        // Check if the sender has sufficient balance
        if (sender.balance < amount) {
            req.flash('error', 'Insufficient Funds');
            return res.redirect('/local')
        } 

        // Deduct the transfer amount from the sender's balance
        sender.balance -= amount;

        // receiver.balance += Number(amount);

        await sender.save();
        // await receiver.save();

         // Description for sender's transaction
         const senderTransactionDescription = `Local transfer of $${amount}. to ${bank}. Account Number: ${receiver.accountNumber}`;

         // Description for receiver's transaction
         const receiverTransactionDescription = `Received from $${sender.accountNumber}, amount received ${amount}`; 

        await addTransaction(sender, 'Debit', senderTransactionDescription, amount);

        // Add a Credit transaction to receiver's history
        await addTransaction(receiver, 'Credit', receiverTransactionDescription, amount);
        
        req.flash('success', 'Transaction successful');
        return res.redirect('/local')

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'An error occurred while processing the transaction' });
    }
});

app.post("/wire", async (req, res) => {
    
    const { senderAccountNumber, beneficiary, receiverAccountNumber, account_type, bank_name, branch_name, country, routingNumber, amount, reason, pinnumber, } = req.body;

    req.session.transactionInfo = {
        senderAccountNumber,
        beneficiary,
        receiverAccountNumber,
        account_type,
        bank_name,
        branch_name,
        country,
        routingNumber,
        amount,
        reason,
        pinnumber,
    };
    console.log('transactionInfo Object:', req.session.transactionInfo);


    const session = await mongoose.startSession();
    session.startTransaction();

    try{
        const sender = await authenticateUser(senderAccountNumber,);

        if (!sender) {
        req.flash('error', 'Authentication failed');
        return res.redirect('/wire')
        }
               
        console.log('Sender Object:', sender);

        const receiver = await findReceiverByAccountNumber(receiverAccountNumber);

        if (!receiver) {
            req.flash('error', 'Invalid receiver account number');
            return res.redirect('/wire')
        }


         // Log sender's balance and transfer amount for debugging
        console.log('Sender balance:', sender.balance);
        console.log('Transfer amount:', amount);


       // Check if the sender has sufficient balance
       if (sender.balance < amount) {
        req.flash('error', 'Insufficient Funds');
        return res.redirect('/wire')

    }

     // Deduct the transfer amount from the sender's balance
     sender.balance -= amount;
    //  receiver.balance += amount;
     await sender.save();
    //  await receiver.save();


     // Description for sender's transaction
     const senderTransactionDescription = `International Wire transfer of $${amount}. to ${beneficiary}. Account Number: ${receiver.accountNumber}`;

     // Description for receiver's transaction
     const receiverTransactionDescription = `Received from $${senderAccountNumber}, amount received $${amount}`;

     // Add Debit transaction to sender's history
     await addTransaction(sender, 'Debit', senderTransactionDescription, amount);

     // Add Credit transaction to receiver's history
     await addTransaction(receiver, 'Credit', receiverTransactionDescription, amount);

    session.endSession(); // End the transaction session
    res.redirect('/code3');
} catch (e) {
        console.error(e);
        session.endSession(); // End the transaction session on error
        res.json({ error: 'An error occurred' });
    }        
        
});

app.post('/code3', async (req, res) => {
        const { taxNumber} = req.body;

        try {
            const sender = await collection.findOne({ taxNumber });

            if (!sender) {
                req.flash('error', 'Invalid Code');
                return res.redirect('/code3')
            }
    
            res.redirect('/code4');
        } catch (e) {
            console.error(e);
            res.json({ error: 'An error occurred' });
        }
});


app.post('/code4', async (req, res) => {
    const { aptNumber} = req.body;

    try {
        const sender = await collection.findOne({ aptNumber });

        if (!sender) {
            req.flash('error', 'Invalid Code');
            return res.redirect('/code4')    
        }

        // Redirect to code5 with necessary data in query parameters
        res.redirect('/code5');
    } catch (e) {
        console.error(e);
        res.json({ error: 'An error occurred' });
    }

});


app.post('/code5', async (req, res) => {
    const { nrtNumber} = req.body;

    try {
        const sender = await collection.findOne({ nrtNumber });


        if (!sender) {
            req.flash('error', 'Invalid Code');
            return res.redirect('/code5');
        }

        // const receiver = await findReceiverByAccountNumber(receiverAccountNumber);

        // if (!receiver) {
        //     req.flash('error', 'Invalid receiver account number');
        //     return res.redirect('/code5');
        // }

        // req.flash('success', 'Transaction successful');
        res.redirect('/preview');
    } catch (e) {
        console.error(e);
        res.json({ error: 'An error occurred' });
    }
});

app.post('/upload', upload.single('image'), async (req, res) => {
    const image = new Image({
        name:req.file.originalname,
        image:{
            data:req.file.buffer,
            contentType:req.file.mimetype
        },
        user: req.user._id,
    })

    await image.save()

    req.flash('success', 'Image uploaded Successfully');
    return res.redirect('/profile');
});

app.post('/reset', (req, res) => {
    res.redirect('/settings')
})



// Routes

app.get('/dashboard', (req, res) => {
    res.render("dashboard.html");
});


app.get('/index', checkAuthenticated, async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("index.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        accountNumber: req.user.accountNumber,
        accttype: req.user.accttype,
        balance: req.user.balance,
        currency: req.user.currency,
        transactionHistory: req.user.transactionHistory,
        images:images,
    });
});

app.get('/about', (req, res) => {
    res.render("about.ejs");
});

app.get('/contactset', (req, res) => {
    res.render("contactset.ejs");
});

app.get('/faq', (req, res) => {
    res.render("faq.ejs");
});


app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render("login.ejs");
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get('/domestic', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("domestic.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name, 
        accountNumber: req.user.accountNumber,
        images:images,
    });
});

app.get('/local', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("local.ejs", 
    { 
        messages: req.flash(),
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        accountNumber: req.user.accountNumber,
        images:images,
    });
});

app.get('/history', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("history.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        transactionHistory: req.user.transactionHistory,
        images:images,
    });
});

app.get('/statement', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("statement.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        transactionHistory: req.user.transactionHistory,
        images:images,
    });
});

app.get('/profile', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("profile.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        state: req.user.state,   
        zipcode: req.user.zipcode,   
        nationality: req.user.nationality,   
        email: req.user.email,   
        dob: req.user.dob,   
        gender: req.user.gender, 
        images:images,
    });
});

app.get('/settings', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("settings.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        images:images,
    });
});

app.get('/contact', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("contact.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        email: req.user.email,
        images:images,
    });
});

app.get('/wire', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("wire.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        accountNumber: req.user.accountNumber,
        images:images,
   
    });
});

app.get('/code3', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("code3.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        images:images,
    });
});

app.get('/code4', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("code4.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        images:images,
    });
});

app.get('/code5', async (req, res) => {
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("code5.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        images:images,
    });
});

app.get('/preview', async (req, res) => {
    const transactionInfo = req.session.transactionInfo;
    const images = await Image.find({ user: req.user._id }).sort({_id:-1})
    res.render("preview.ejs", 
    { 
        last_name: req.user.last_name,
        first_name: req.user.first_name,
        transactionInfo: transactionInfo,
        amount: transactionInfo.amount,
        beneficiary: transactionInfo.beneficiary,
        receiverAccountNumber: transactionInfo.receiverAccountNumber,
        routingNumber: transactionInfo.routingNnumber,
        bank_name: transactionInfo.bank_name,
        branch_name: transactionInfo.branch_name,
        country: transactionInfo.country,
        images:images,
    });
});
// End Routes


app.delete("/logout", (req, res) => {
    req.logOut(req.user, err => {
        if (err) return next(err)
        res.redirect("/login")
    });
});

function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect("/login")
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
       return res.redirect("/index")    
    }
    next()
}


 app.listen(3000)