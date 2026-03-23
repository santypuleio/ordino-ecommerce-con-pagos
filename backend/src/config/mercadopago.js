import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { env } from "./env.js";

const client = new MercadoPagoConfig({
  accessToken: env.MP_ACCESS_TOKEN,
  options: { timeout: 10000 },
});

export const mpPreference = new Preference(client);
export const mpPayment = new Payment(client);

