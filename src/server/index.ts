
import * as express from "express";
import * as bodyParser from "body-parser";
import * as chalk from "chalk";

const app = express();

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Content-type');
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS,PATCH");
    res.header('Access-Control-Max-Age', "1728000");//预请求缓存20天
    next();  
});
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

app.listen(8888, () => {
    console.log('App listening on port 8888.');
    console.log(chalk.green('Server has started!'));
});

app.post('/', (req, res, next) => {

    let query = req.body.query;
    if (query) {

    } else {
        return res.json(new Response(0, "miss param: query", null));

    }
});

app.get('/', (req, res, next) => {
    res.send("Hello World");
});

class Response {
    constructor(status, message, data) {
        this.status = status;
        this.message = message;
        this.result = data;
    }
    status: number;
    message: string;
    result: any;
}
