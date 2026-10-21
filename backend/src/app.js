import express from "express";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json({ limit: "16kb" }));

// Health Check API :-

app.get("/api/v1/health" , (req,res) => {
    res.status(200).json({
        success : true,
        message : "Women Safety API is running successfully",
        data: {
            "status": "ok"
        }
    });

});



app.use(notFound);
app.use(errorHandler);

export default app;
