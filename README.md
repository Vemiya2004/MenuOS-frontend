# QR Restaurant Ordering System - Frontend

## 📁 Folder Structure

```
frontend/
├── index.html
├── menu.html
├── cart.html
├── checkout.html
├── css/
│   └── style.css
├── js/
│   ├── menu.js
│   ├── cart.js
│   └── checkout.js
└── public/
    └── uploads/
        └── food_category/
            ├── breakfast/
            ├── lunch/
            ├── dinner/
            ├── treats/
            ├── dessert/
            └── drinks/
```

## 🖼️ Image Setup

### Required Images by Category:

#### Breakfast (public/uploads/food_category/breakfast/)
- `pancakes.jpg` - Pancakes with syrup
- `french-toast.jpg` - French toast with berries
- `omelette.jpg` - Cheese omelette

#### Lunch (public/uploads/food_category/lunch/)
- `fried-rice.jpg` - Chicken fried rice
- `noodles.jpg` - Spicy noodles
- `burger.jpg` - Chicken burger
- `grilled-chicken.jpg` - Grilled chicken
- `pizza.jpg` - Margherita pizza

#### Dinner (public/uploads/food_category/dinner/)
- `steak.jpg` - Grilled steak
- `salmon.jpg` - Salmon fillet
- `pasta.jpg` - Pasta carbonara
- `curry.jpg` - Chicken curry

#### Treats (public/uploads/food_category/treats/)
- `brownie.jpg` - Chocolate brownie
- `donuts.jpg` - Glazed donuts
- `cookies.jpg` - Chocolate chip cookies

#### Dessert (public/uploads/food_category/dessert/)
- `chocolate-cake.jpg` - Chocolate cake
- `ice-cream.jpg` - Ice cream scoops
- `cheesecake.jpg` - Cheesecake slice

#### Drinks (public/uploads/food_category/drinks/)
- `juice.jpg` - Orange juice
- `smoothie.jpg` - Berry smoothie
- `coffee.jpg` - Coffee cup
- `milkshake.jpg` - Chocolate milkshake

## 🚀 How to Use

### 1. Setup Images
Download food images from free stock photo sites:
- [Unsplash](https://unsplash.com/s/photos/food)
- [Pexels](https://www.pexels.com/search/food/)
- [Pixabay](https://pixabay.com/images/search/food/)

Save images in their respective folders following the naming convention above.

### 2. Test with QR Code
Open the landing page with table parameter:
```
index.html?table=5
```

### 3. Backend Integration
Update API_BASE in these files:
- `js/menu.js`
- `js/cart.js`
- `js/checkout.js`

Change from:
```javascript
const API_BASE = 'http://localhost:5000';
```

To your backend URL.

## 📱 Features

- ✅ QR Code table detection
- ✅ 7 Categories (All/Breakfast/Lunch/Dinner/Treats/Dessert/Drinks)
- ✅ 22 Menu items with local images
- ✅ Search functionality
- ✅ Shopping cart with localStorage
- ✅ Pay Now / Pay After options
- ✅ Mobile responsive design
- ✅ Real-time cart badge counter

## 🎨 Categories

1. **All** - Shows all items
2. **Breakfast** - Morning items (3 items)
3. **Lunch** - Midday meals (5 items)
4. **Dinner** - Evening meals (4 items)
5. **Treats** - Snacks (3 items)
6. **Dessert** - Sweet dishes (3 items)
7. **Drinks** - Beverages (4 items)

## 🔄 User Flow

1. Scan QR code → `index.html?table=X`
2. Landing page shows table number
3. Click "Start Ordering" → `menu.html`
4. Browse menu by category
5. Add items to cart
6. Go to cart → `cart.html`
7. Review and adjust quantities
8. Click "Pay Now" or "Pay After" → `checkout.html`
9. Confirm order
10. Success message → Redirect to menu

## 📝 Notes

- Table number is stored in localStorage
- Cart persists in localStorage
- Images fallback to 🍽️ emoji if not found
- Backend API endpoints are ready for integration
- Payment method is saved for checkout page

## 🛠️ Customization

To add more items:
1. Add images to appropriate folders
2. Update `sampleMenuItems` array in `js/menu.js`
3. Follow the existing data structure

To change colors:
- Edit `#2d7a7c` (teal) in `css/style.css`

## 📞 Support

For issues or questions, check the backend API documentation.