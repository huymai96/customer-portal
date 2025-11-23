import fs from 'node:fs';
import path from 'node:path';

const targetDir = path.resolve('tmp/sanmar');
fs.mkdirSync(targetDir, { recursive: true });

const csvRows = [
  'STYLE#,PRODUCT_TITLE,PRODUCT_DESCRIPTION,MILL,COLOR_NAME,SANMAR_MAINFRAME_COLOR,COLOR_SQUARE_IMAGE,SIZE,SIZE_INDEX,COLOR_PRODUCT_IMAGE,COLOR_PRODUCT_IMAGE_THUMBNAIL,PRODUCT_IMAGE,FRONT_MODEL_IMAGE_URL,BACK_MODEL_IMAGE_URL,FRONT_FLAT_IMAGE_URL,BACK_FLAT_IMAGE_URL,GTIN,CATEGORY_NAME,SUBCATEGORY_NAME,PRICE_TEXT,SUGGESTED_PRICE,PRICE_GROUP,CASE_SIZE,PRODUCT_STATUS,MSRP,MAP_PRICING,COMPANION_STYLE,AVAILABLE_SIZES,PRODUCT_MEASUREMENTS,PMS_COLOR,PIECE_WEIGHT,PIECE_PRICE,DOZENS_PRICE,CASE_PRICE,QTY',
  'PC43,Port & Company Core Cotton Pocket Tee,Classic pocket tee ready for promo programs,Port & Company,White,WHITE,https://cdn.sanmar.com/color/pc43-white.jpg,S,1,https://cdn.sanmar.com/images/pc43_white.jpg,https://cdn.sanmar.com/images/pc43_white_thumb.jpg,https://cdn.sanmar.com/images/pc43_main.jpg,,,,,1234567890123,T-Shirts,Core Basics,$4.50,$7.98,CORE,72,ACTIVE,$8.99,,PC43,"S,M,L,XL,2XL","Body Length 28-32",WHITE,0.42,4.10,47.50,85.00,150',
  'PC43,Port & Company Core Cotton Pocket Tee,Classic pocket tee ready for promo programs,Port & Company,Navy,NAVY,https://cdn.sanmar.com/color/pc43-navy.jpg,M,2,https://cdn.sanmar.com/images/pc43_navy.jpg,https://cdn.sanmar.com/images/pc43_navy_thumb.jpg,https://cdn.sanmar.com/images/pc43_main.jpg,,,,,1234567890456,T-Shirts,Core Basics,$4.50,$7.98,CORE,72,ACTIVE,$8.99,,PC43,"S,M,L,XL,2XL","Body Length 28-32",NAVY,0.44,4.10,47.50,85.00,90',
  'PC43,Port & Company Core Cotton Pocket Tee,Classic pocket tee ready for promo programs,Port & Company,Black,BLACK,https://cdn.sanmar.com/color/pc43-black.jpg,L,3,https://cdn.sanmar.com/images/pc43_black.jpg,https://cdn.sanmar.com/images/pc43_black_thumb.jpg,https://cdn.sanmar.com/images/pc43_main.jpg,,,,,1234567890789,T-Shirts,Core Basics,$4.50,$7.98,CORE,72,ACTIVE,$8.99,,PC43,"S,M,L,XL,2XL","Body Length 28-32",BLACK,0.45,4.10,47.50,85.00,110',
].join('\n');

fs.writeFileSync(path.join(targetDir, 'SanMar_SDL_N.csv'), csvRows, 'utf8');

const dipRows = [
  'catalog_no|catalog_color|size|whse_no|whse_name|quantity|piece_weight',
  'PC43|White|S|DAL|Dallas, TX|120|0.42',
  'PC43|White|S|SEA|Seattle, WA|80|0.42',
  'PC43|Navy|M|CIN|Cincinnati, OH|60|0.44',
  'PC43|Navy|M|DAL|Dallas, TX|40|0.44',
  'PC43|Black|L|PHX|Phoenix, AZ|70|0.45',
  'PC43|Black|L|RNO|Reno, NV|55|0.45',
].join('\n');

fs.writeFileSync(path.join(targetDir, 'sanmar_dip.txt'), dipRows, 'utf8');

console.log('Sample SanMar data prepared in', targetDir);

