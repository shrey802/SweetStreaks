// ALL THE PACKAGES USED IN BACKEND ARE HERE
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const Razorpay = require('razorpay');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const session = require('express-session');

// SETTING EXPRESS APP
const app = express();

// SETTING PORT
const PORT = process.env.PORT || 5000;

// SETTING ALL THE CONFIGURATIONS FOR BACKEND
const corsOptions = {
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  origin: 'http://localhost:3000',
};
app.use(bodyParser.json());
app.use(cors(corsOptions));

// CREATING SESSIONS FOR AUTHENTICATION
app.use(
  session({
    secret: 'richflex',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days in milliseconds
    },
  })
);
// CONNECTION POOL TO CONNECT TO POSTGRES DB
const pool = new Pool({
  user: 'shreyash',
  password: 'utopiathegoat',
  host: 'localhost', // Update this if your Docker setup is different
  port: 5432, // Default PostgreSQL port
  database: 'sweetDB'
});


// get the registration page
app.get('/', (req, res) => {
  res.status(201);
});

// get the payment page
app.get('/payment', (req, res) => {
  res.status(200);
})


// CREATE USER ACCOUNT & STORE IN TABLE
app.post('/register', async (req, res) => {
  try {
    const { email, password, fullname, address, contactNumber } = req.body;

    // Generate a UUID for userID
    const userID = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (userid, email, password, fullname, address, contactNumber) VALUES ($1, $2, $3, $4, $5, $6)';
    await pool.query(query, [userID, email, hashedPassword, fullname, address, contactNumber]);
    req.session.userID = userID;
    res.status(201).json({ message: 'User registered successfully', userID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get the homepage
app.get('/home', (req, res) => {
  res.status(200);
})

// we get the login page here
app.get('/login', (req, res) => {
  res.status(200);
})

// get the about page here
app.get('/about', async (req, res) => {
  res.status(200);
})

// get the contact page here
app.get('/contact', async (req, res) => {
  res.status(200);
})

// we verify the user credentials to login the user
app.post('/loginVerify', async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email=$1';
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      // User not found
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Password doesn't match
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.session.userID = user.userid;
    // Password matches, user is authenticated
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.json(error);
  }
})

// we create a new order here 
app.post('/create-order', async (req, res) => {
  try {
    const instance = new Razorpay({
      key_id: process.env.KEY_ID,
      key_secret: process.env.KEY_SECRET
    });

    const { orderAmount } = req.body;
    const orderOptions = {
      amount: orderAmount * 100, // Convert to paisa (100 times)
      currency: 'INR',
      receipt: `order_${Date.now()}`, // Generate a unique receipt
      payment_capture: 1, // Auto-capture payment
    };

    instance.orders.create(orderOptions, (error, order) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error creating order' });
      }
      res.json({ order_id: order.id }); // Sending just the order ID as the response
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// verifying the payment method
app.post('/verifypayment', (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;
    const sign = razorpay_order_id + " | " + razorpay_payment_id;

    const expectedSign = crypto.createHmac("sha256", `${process.env.KEY_SECRET}`).update(sign.toString()).digest('hex')
    if (razorpay_signature === expectedSign) {
      return res.status(200).json({ success: 'success' })
    } else {
      return res.status(400).json({ error: 'error' });
    }

  } catch (error) {
    console.log(error);
  }
})

// logs the user out of the web application
app.post('/logout', async (req, res) => {
  try {
    req.session.destroy();
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get all the user details for usecase
app.post('/get-user-details', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(userId);
    const getUserQuery = `
      SELECT email, contactnumber
      FROM users
      WHERE userid = $1
    `;

    const userResult = await pool.query(getUserQuery, [userId]);

    if (userResult.rowCount === 1) {
      const userDetails = userResult.rows[0];
      res.status(200).json(userDetails);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// route for submitting the user query
app.post('/submitQuery', async (req, res) => {
  try {
    const { email, query } = req.body;
    const queryText = 'INSERT INTO queries (email, query) VALUES ($1, $2)';
    await pool.query(queryText, [email, query]);

    res.status(201).json({ message: 'Query submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// get all the products on this page
app.get('/products', (req, res) => {
  res.status(200).json({ message: 'Product Page Rendered' })
})

// get all the sweets on this route
app.get('/getallSweets', async (req, res) => {
  try {
    const query = 'SELECT * FROM products';
    const result = await pool.query(query);
    const products = result.rows;
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

// store the paid order in table
app.post('/store-order', async (req, res) => {
  try {
    const order_id = uuidv4();
    const {
      userID,
      productID,
      productPrice,
      quantity,
      address,
      contact,
    } = req.body;

    const insertQuery = `
      INSERT INTO orders (user_id, product_id, order_id, product_price, quantity, address, contact)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      userID,
      productID,
      order_id,
      productPrice,
      quantity,
      address,
      contact
    ];

    const result = await pool.query(insertQuery, values);

    if (result.rows.length > 0) {
      res.status(201).json({ message: 'Order stored successfully' });
      console.log('stored');
    } else {
      res.status(500).json({ message: 'Failed to store order' });
    }
  } catch (error) {
    console.error('Error storing order:', error);
    res.status(500).json({ message: 'An error occurred while storing order' });
  }
});

// get all the products data for usecases
app.post('/getproductdata', async (req, res) => {
  try {
    const { productID } = req.body;
    const wholeQuery = `
    SELECT * FROM cart
    WHERE product_id = $1
    `
    const result = await pool.query(wholeQuery, [productID]);
    const sweetdata = result.rows[0];

    if (!sweetdata) {
      return res.status(404).json({ error: 'product not found' });
    }

    res.status(200).json(sweetdata);
  } catch (error) {
    console.log(error);
  }
})


// another route for getting data
app.post('/getdataofuser', async (req, res) => {
  try {
    const { userID } = req.body;
    const theWholeQuery = `
      SELECT * FROM users
      WHERE userid = $1
    `;

    const result = await pool.query(theWholeQuery, [userID]);
    const sweetUser = result.rows[0];

    if (!sweetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(sweetUser);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'An error occurred while fetching user details' });
  }
});

// update the product data (quantity & cost)
app.put('/update-cart-item', async (req, res) => {
  try {
    const { cart_id, quantity, price } = req.body;

    const updateQuery = `
      UPDATE cart
      SET quantity = $1, price = $2
      WHERE cart_id = $3
    `;
    await pool.query(updateQuery, [quantity, price, cart_id]);
    res.status(200).json({ message: 'Product quantity and price updated successfully' });
  } catch (error) {
    console.log(error);
  }
})

// get a specific sweet using it's id
app.get('/getSweet/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM products WHERE product_id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sweet not found' });
    }

    const sweet = result.rows[0];
    res.status(200).json(sweet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

// get the cart
app.get('/cart', (req, res) => {
  res.status(200);
})


// Route to add a product to the cart
app.post('/add-to-cart', async (req, res) => {
  try {
    const { sessionUserID, product_id, quantity, price } = req.body;
    const user_id = sessionUserID; // Make sure this is a string (UUID)

    // Generate a UUID for cart_id
    const cart_id = uuidv4();
    // Insert the cart item into the cart table
    const query = `
      INSERT INTO cart (cart_id, product_id, user_id, quantity, price)
      VALUES ($1, $2, $3::uuid, $4, $5)
    `;
    await pool.query(query, [cart_id, product_id, user_id, quantity, price]);

    res.status(201).json({ message: 'Product added to cart successfully' });
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: 'An error occurred while adding the product to cart' });
  }
});

// get all the cart items
app.get('/get-cart', async (req, res) => {
  try {
    const user_id = req.query.userid; // Retrieve user ID from query parameter

    const query = `
      SELECT c.*, p.product_name, p.price, p.image_url, p.description
      FROM cart c
      INNER JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = $1::uuid
    `;
    const result = await pool.query(query, [user_id]);
    const cartContents = result.rows;

    res.status(200).json(cartContents);
  } catch (error) {
    console.error('Error fetching cart contents:', error);
    res.status(500).json({ error: 'An error occurred while fetching cart contents' });
  }
});

// remove products from cart
app.post('/remove-product', async (req, res) => {
  try {
    const { cart_id } = req.body;
    const query = `
      DELETE FROM cart
      WHERE cart_id = $1
    `;
    await pool.query(query, [cart_id]);

    res.status(200).json({ message: 'Product removed from cart successfully' });
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ error: 'An error occurred while removing the product from cart' });
  }
})

// server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
