import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
console.log(api.getUri({ url: '/dashboard' }));

const api2 = axios.create({ baseURL: 'https://pricepilot-bpmn.onrender.com/api' });
console.log(api2.getUri({ url: '/dashboard' }));

const api3 = axios.create({ baseURL: 'https://pricepilot-bpmn.onrender.com' });
console.log(api3.getUri({ url: '/dashboard' }));
