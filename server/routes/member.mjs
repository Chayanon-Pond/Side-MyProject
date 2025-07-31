import { Router } from "express";

const memberRouter = Router()

memberRouter.get("/:id",async(req,res) => {
    return res.json({message: "get"})
})
