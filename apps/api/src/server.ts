import express from "express";
import cors from "cors";
import helmet from "helmet";
import {readFile} from "node:fs/promises";
import {calculateKpis, type CropRecord} from "@kpp/shared";
const app=express();
app.use(helmet());app.use(cors({origin:(process.env.ALLOWED_ORIGINS??"http://localhost:5173").split(",")}));app.use(express.json({limit:"1mb"}));
const dataPath=new URL("../../web/public/data/crop-annual.json",import.meta.url);
async function records(){return JSON.parse(await readFile(dataPath,"utf8")).records as CropRecord[]}
app.get("/health",(_req,res)=>res.json({status:"ok"}));
app.get("/api/v1/public/meta",async(_req,res)=>{const rows=await records();res.json({records:rows.length,years:[...new Set(rows.map(r=>r.year_be))],crops:[...new Set(rows.map(r=>r.crop_name))]})});
app.get("/api/v1/public/kpis",async(req,res)=>{let rows=(await records()).filter(r=>r.data_status==="published");if(req.query.year)rows=rows.filter(r=>r.year_be===Number(req.query.year));if(req.query.crop)rows=rows.filter(r=>r.crop_id===req.query.crop);if(req.query.district)rows=rows.filter(r=>r.district_code===req.query.district);res.json(calculateKpis(rows))});
app.use("/api/v1/admin",(_req,res)=>res.status(501).json({error:{code:"ADMIN_ADAPTER_NOT_CONFIGURED",message:"เชื่อม Google OAuth และ Google Sheets ก่อนเปิดใช้คำสั่งเขียน"}}));
const port=Number(process.env.PORT??8080);app.listen(port,()=>console.log(`API listening on ${port}`));
