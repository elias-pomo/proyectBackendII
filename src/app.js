import express from 'express';
const PORT = 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/tickets", require("./routes/tickets.routes.js"));

const server = app.listen(PORT, () =>{
    console.log(`Server is running on port ${PORT}`);
})