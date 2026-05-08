const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A product must have a name"],
        minlength: [3, "A product name must have at least 3 characters"],
        unique: true, // Added to test duplicate database fields
        trim: true
    },
    price: {
        type: Number,
        required: [true, "A product must have a price"],
        min: [1, "A product price must be at least 1"]
    },
    category: {
        type: String,
        required: [true, "A product must have a category"],
        enum: {
            values: ["Electronics", "Clothes", "Books", "Food", "Home", "Services", "Sports", "Others"],
            message: "Category must be Electronics, Clothes, Books, Food, Home, Services, Sports, or Others"
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: [50, 'A product description must be 50 characters or less']
    },
    seller: {
        type: String,
        required: [true, "A product must have a seller"],
        minlength: [2, "A seller name must have at least 2 characters"]
    },
    postedDate: {
        type: Date,
        default: Date.now
    },
    productSlug: String,
    premiumProducts: {
        type: Boolean,
        default: false
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(val) {
                return val < this.price;
            },
            message: "Discount price ({VALUE}) should be below the regular price"
        }
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

productSchema.virtual('daysPosted').get(function() {
    if (!this.postedDate) return 0;
    return Math.floor((Date.now() - this.postedDate.getTime()) / (1000 * 60 * 60 * 24));
});

productSchema.pre('save', function() {
    if (this.name) {
        this.productSlug = this.name.replace(/\s+/g, '-').toUpperCase();
    }
});

productSchema.pre(/^find/, function() {
    this.find({ premiumProducts: { $ne: true } });
});

productSchema.pre('aggregate', function() {
    this.pipeline().unshift({ $match: { premiumProducts: { $ne: true } } });
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
