import { Customer, Order } from '@prisma/client';

export type CustomerWithOrders = Customer & {
  orders: Order[];
};

export function personalizeMessage(template: string, customer: CustomerWithOrders): string {
  let message = template;

  // Replace {name}
  message = message.replace(/{name}/g, customer.name);

  // Replace {city}
  message = message.replace(/{city}/g, customer.city);

  // Replace {email}
  message = message.replace(/{email}/g, customer.email);

  // Replace {phone}
  message = message.replace(/{phone}/g, customer.phone);

  // Replace {age}
  message = message.replace(/{age}/g, customer.age.toString());

  // Replace {gender}
  message = message.replace(/{gender}/g, customer.gender.toLowerCase());

  // Replace {last_product}
  const lastOrder = customer.orders && customer.orders.length > 0
    ? customer.orders.reduce((latest, current) => 
        current.orderedAt.getTime() > latest.orderedAt.getTime() ? current : latest
      , customer.orders[0])
    : null;

  const lastProduct = lastOrder ? lastOrder.productName : 'our products';
  message = message.replace(/{last_product}/g, lastProduct);

  return message;
}
