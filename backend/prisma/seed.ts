import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune'];
const CATEGORIES = ['Fashion', 'Beauty', 'Electronics', 'Food & Beverage'];
const PRODUCTS = {
  'Fashion': ['T-Shirt', 'Jeans', 'Sneakers', 'Jacket', 'Sari', 'Kurta'],
  'Beauty': ['Lipstick', 'Moisturizer', 'Perfume', 'Shampoo', 'Face Wash'],
  'Electronics': ['Headphones', 'Smartwatch', 'Powerbank', 'Phone Case', 'Bluetooth Speaker'],
  'Food & Beverage': ['Coffee Beans', 'Green Tea', 'Gourmet Chocolates', 'Protein Bars', 'Organic Honey']
};

async function main() {
  console.log('Clearing database...');
  await prisma.receipt.deleteMany();
  await prisma.message.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  console.log('Seeding customers...');
  const customers = [];
  for (let i = 0; i < 500; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female']);
    const firstName = faker.person.firstName(gender === 'male' ? 'male' : 'female');
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase() + `_${i}@example.com`;
    const phone = '+91 ' + faker.string.numeric({ length: 10, exclude: ['0', '1', '2', '3', '4', '5'] });
    const city = faker.helpers.arrayElement(CITIES);
    const age = faker.number.int({ min: 18, max: 55 });
    const createdAt = faker.date.past({ years: 1 });

    customers.push({
      name,
      email,
      phone,
      city,
      gender: gender.toUpperCase(),
      age,
      createdAt
    });
  }

  await prisma.customer.createMany({ data: customers });
  const allCustomers = await prisma.customer.findMany();

  console.log('Seeding orders...');
  const orders = [];
  for (let i = 0; i < 1200; i++) {
    const customer = faker.helpers.arrayElement(allCustomers);
    const productCategory = faker.helpers.arrayElement(CATEGORIES);
    const productList = PRODUCTS[productCategory as keyof typeof PRODUCTS];
    const productName = faker.helpers.arrayElement(productList);
    const amount = parseFloat(faker.commerce.price({ min: 200, max: 5000 }));
    const orderedAt = faker.date.past({ years: 0.5 });

    orders.push({
      customerId: customer.id,
      amount,
      productName,
      productCategory,
      orderedAt
    });
  }

  await prisma.order.createMany({ data: orders });

  console.log('Seeding completed demo campaigns...');
  const camp1 = await prisma.campaign.create({
    data: {
      name: 'Monsoon Special Win-Back',
      segmentQuery: {
        description: 'Customers who have at least 2 orders and haven\'t bought in 60 days',
        filters: { min_orders: 2, inactive_days: 60 }
      },
      messageTemplate: 'Hey {name}, we miss you in {city}! Get 20% off your next order. Code: COMEBACK20',
      channel: 'whatsapp',
      status: 'COMPLETED',
      createdAt: faker.date.past({ years: 0.2 }),
    }
  });

  const camp2 = await prisma.campaign.create({
    data: {
      name: 'Premium Audio Gear Launch',
      segmentQuery: {
        description: 'Customers who spent 5,000+ total in Electronics',
        filters: { min_spent: 5000, product_category: 'Electronics' }
      },
      messageTemplate: 'Hi {name}! Check out our new Active Noise Cancelling Headphones. Pre-book today!',
      channel: 'email',
      status: 'COMPLETED',
      createdAt: faker.date.past({ years: 0.1 }),
    }
  });

  const camp3 = await prisma.campaign.create({
    data: {
      name: 'Mumbai & Pune Fashion Sale',
      segmentQuery: {
        description: 'Customers in Mumbai or Pune',
        filters: { city: 'Mumbai,Pune' }
      },
      messageTemplate: 'Hey {name}, fashion sale is live in {city}! Buy 1 get 1 free today only!',
      channel: 'sms',
      status: 'COMPLETED',
      createdAt: faker.date.past({ years: 0.05 }),
    }
  });

  const campaignsList = [
    { campaign: camp1, size: 120, openProb: 0.6, clickProb: 0.3, failProb: 0.05 },
    { campaign: camp2, size: 90, openProb: 0.4, clickProb: 0.15, failProb: 0.02 },
    { campaign: camp3, size: 150, openProb: 0.8, clickProb: 0.45, failProb: 0.10 }
  ];

  for (const item of campaignsList) {
    const { campaign, size, openProb, clickProb, failProb } = item;
    const selectedCustomers = faker.helpers.arrayElements(allCustomers, size);
    
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let opened = 0;
    let clicked = 0;

    for (const customer of selectedCustomers) {
      let msgText = campaign.messageTemplate
        .replace('{name}', customer.name)
        .replace('{city}', customer.city);

      const statusRand = Math.random();
      let status = 'SENT';
      if (statusRand < failProb) {
        status = 'FAILED';
        failed++;
      } else {
        const openRand = Math.random();
        if (openRand < openProb) {
          const clickRand = Math.random();
          if (clickRand < clickProb) {
            status = 'CLICKED';
            clicked++;
            opened++;
          } else {
            status = 'OPENED';
            opened++;
          }
        } else {
          status = 'DELIVERED';
        }
        delivered++;
      }
      sent++;

      const message = await prisma.message.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          personalizedMessage: msgText,
          channel: campaign.channel,
          status,
          sentAt: campaign.createdAt,
        }
      });

      if (status !== 'SENT') {
        if (status === 'FAILED') {
          await prisma.receipt.create({
            data: { messageId: message.id, event: 'FAILED', receivedAt: campaign.createdAt }
          });
        } else {
          await prisma.receipt.create({
            data: { messageId: message.id, event: 'DELIVERED', receivedAt: campaign.createdAt }
          });
          if (status === 'OPENED' || status === 'CLICKED') {
            await prisma.receipt.create({
              data: { messageId: message.id, event: 'OPENED', receivedAt: new Date(campaign.createdAt.getTime() + 5000) }
            });
          }
          if (status === 'CLICKED') {
            await prisma.receipt.create({
              data: { messageId: message.id, event: 'CLICKED', receivedAt: new Date(campaign.createdAt.getTime() + 12000) }
            });
          }
        }
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        totalSent: sent,
        totalDelivered: delivered,
        totalFailed: failed,
        totalOpened: opened,
        totalClicked: clicked
      }
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
