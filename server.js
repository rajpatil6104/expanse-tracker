const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;


// Use EJS templates
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

// Dummy user (store securely or use a DB in production)
const users = [
    { username: 'admin', password: bcrypt.hashSync('password123', 10) }
];

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Routes
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('dashboard', { username: req.session.user });
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = username;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

app.post('/add-expense', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { date, amount, category, description } = req.body;
    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[date, amount, category, description, req.session.user]],
        },
    });
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
