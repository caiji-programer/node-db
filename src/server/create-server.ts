
import * as express from "express";
import * as bodyParser from "body-parser";
import * as chalk from "chalk";


export default function createServer(port) {

    port = port || 8888;

    const app = express();

    app.all('*', function (req, res, next) {
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

    app.listen(port, () => {
        console.log(`App listening on port ${port}.`);
        console.log(chalk.green('Server has started!'));
    });

    return app;
}
