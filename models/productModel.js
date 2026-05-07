const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A product must have a name"],
        unique: true, // Added to test duplicate database fields
        trim: true
    },
    price: {
        type: Number,
        required: [true, "A product must have a price"]
    },
    category: {
        type: String,
        required: [true, "A product must have a category"]
    },
    description: {
        type: String,
        trim: true,
        maxlength: [50, 'A product description must be 50 characters or less']
    },
    seller: {
        type: String,
        required: [true, "A product must have a seller"]
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