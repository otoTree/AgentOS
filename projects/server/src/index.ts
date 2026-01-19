import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
