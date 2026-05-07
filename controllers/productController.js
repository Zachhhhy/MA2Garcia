const Product = require("./../models/productModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

exports.aliasTopCheapest = (req, res, next) => {
    req.query.limit = '3';
    req.query.sort = 'price';
    req.query.fields = 'name,price,category,seller';
    next();
};

exports.getProductCategoryStats = catchAsync(async (req, res, next) => {
    try {
        const stats = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    numProducts: { $sum: 1 },
                    avgPrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' },
                    totalValue: { $sum: '$price' }
                }
            },
            { $sort: { numProducts: -1, _id: 1 } }
        ]);

        res.status(200).json({
            status: "success",
            data: { stats }
        });
    } catch (err) {
        next(err);
    }
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
    try {
        const features = new APIFeatures(Product.find(), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
            
        const products = await features.query;

        res.status(200).json({
            status: "success",
            results: products.length,
            data: { products }
        });
    } catch (err) {
        next(err);
    }
});

exports.getProduct = catchAsync(async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        
        // Handle correct ID format but ID does not exist
        if (!product) {
            return next(new AppError('No product found with that ID', 404));
        }

        res.status(200).json({
            status: "success",
            data: { product }
        });
    } catch (err) {
        next(err);
    }
});

exports.createProduct = catchAsync(async (req, res, next) => {
    try {
        const newProduct = await Product.create(req.body);
        res.status(201).json({
            status: "success",
            data: { product: newProduct }
        });
    } catch (err) {
        next(err);
    }
});

exports.updateProduct = catchAsync(async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            returnDocument: 'after',
            runValidators: true
        });

        if (!product) {
            return next(new AppError('No product found with that ID', 404));
        }

        res.status(200).json({
            status: "success",
            data: { product }
        });
    } catch (err) {
        next(err);
    }
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return next(new AppError('No product found with that ID', 404));
        }

        res.status(204).json({
            status: "success",
            data: null
        });
    } catch (err) {
        next(err);
    }
});
