import express from 'express';
import Router from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
Router(app);
app.listen(port, () => console.log(`Express server listening on port ${port}`));

export default app;
