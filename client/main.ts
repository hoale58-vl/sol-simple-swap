import dotenv from 'dotenv';

dotenv.config({ path: __dirname+'/.env' });

async function main() {
    console.log(process.env);
}

main();