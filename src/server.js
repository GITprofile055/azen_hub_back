 require('dotenv').config();
 const app = require("./app"); // 👈 Make sure this is at the top
 const sequelize = require('./config/connectDB');  // Remove the destructuring

const PORT = process.env.PORT || 5000;

sequelize.authenticate()  // This checks if the database connection is successful
  .then(() => {
    console.log("✅ Database Connected Successfully");

    // Start server after DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database Connection Error:", err);
    process.exit(1);  // Exit process if the DB connection fails
  });
// app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });
