const Joi = require('joi');

const searchSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(100).max(3000000).default(5000),
  q: Joi.string().trim().allow('', null).max(100).optional(),
  sort: Joi.string().valid('relevance', 'rating', 'distance', 'delivery').default('relevance').optional(),
  cuisineTypes: Joi.alternatives().try(
    Joi.string().trim().max(200),
    Joi.array().items(Joi.string().trim())
  ).optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  priceRange: Joi.alternatives().try(
    Joi.string().valid('$', '$$', '$$$', '$$$$').trim(),
    Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
  ).optional(),
  features: Joi.alternatives().try(
    Joi.string().trim().max(200),
    Joi.array().items(Joi.string().trim())
  ).optional(),
  isOpen: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
  skip: Joi.number().integer().min(0).default(0),
});

const testData = {
  radius: '2500000',
  sort: 'relevance',
  lat: '17.509816666666666',
  lng: '78.404958'
};

const { error, value } = searchSchema.validate(testData, { 
    abortEarly: false,
    stripUnknown: true,
    convert: true 
});

if (error) {
  console.log('Validation Error:', JSON.stringify(error.details, null, 2));
} else {
  console.log('Validation Success:', value);
}
