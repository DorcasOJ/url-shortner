import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import { object, string } from "yup";
import monk from "monk";
import expressRateLimit from "express-rate-limit";
import expressSlowDown from "express-slow-down";
import { nanoid } from "nanoid";
import * as dotenv from 'dotenv'

dotenv.config();

const db = monk(process.env.MONGODB_URI);
const urls = db.get("urls");
urls.createIndex({ slug: 1 }, { unique: true });

const app = express();
app.enable("trust proxy");

app.use(helmet());
app.use(morgan("common"));
app.use(express.json());
app.use(express.static("./public"));

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)
// console.log(path.dirname(fileURLToPath(import.meta.url)))
const notFoundPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "public/404.html");
const botSite = 'cdg.sh';

app.get("/:id", async (req, res, next) => {
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    if (url) {
      return res.redirect(url.url);
    }
    return res.status(404).sendFile(notFoundPath);
  } catch (error) {
    return res.status(404).sendFile(notFoundPath);
  }
});

const schema = object().shape({
  slug: string()
    .trim()
    .matches(/^[\w\-]+$/i),
  url: string().trim().url().required(),
});

app.post(
  "/url",
  expressSlowDown({ windowMs: 30 * 1000, delayAfter: 1, delayMs: 500 }),
  expressRateLimit({ windowMs: 30 * 1000, max: 1 }),
  async (req, res, next) => {
    let { slug, url } = req.body;
    try {
        throw new Error('Url shortening is no longer open to the public')
        await schema.validate({slug, url});
        if(url.includes(botSite)) {
            throw new Error('Stop it. 🛑');
        }
        if (!slug) {
            slug = nanoid(5);
        } else {
            const existing = await urls.findOne({slug});
            if (existing) {
                throw new Error('Slug in use');
            }
        }
        slug = slug.toLowerCase();
        const newUrl = {
            url,
            slug,
        };
        const created = await urls.insert(newUrl);
        res.json(created)
    } catch (error) {
      next(error);
    }
  }
);

app.use((req, res, next) => {
    res.status(404).sendFile(notFoundPath);
})

app.use((error, req, res, next) => {
    if(error.status) {
        res.status(error.status);
    } else {
        res.status(500)
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ?  '🥞' : error.stack,
    })
})


const port = process.env.PORT || 1337;
app.listen(port, ()=> {
    console.log(`Listening at http://localhost:${port}`);
})