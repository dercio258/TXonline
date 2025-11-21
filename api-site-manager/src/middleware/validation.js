import Joi from 'joi';

const siteSchema = Joi.object({
  subdomain: Joi.string().alphanum().min(3).max(50).required(),
  type: Joi.string().valid('wordpress', 'static').default('static'),
  adminEmail: Joi.string().email().optional(),
  adminUser: Joi.string().alphanum().min(3).max(20).optional(),
  adminPassword: Joi.string().min(8).optional(),
  storageLimit: Joi.number().positive().optional()
});

const updateSiteSchema = Joi.object({
  storageLimit: Joi.number().positive().optional(),
  status: Joi.string().valid('active', 'suspended', 'deleted').optional()
});

const subdomainSchema = Joi.object({
  subdomain: Joi.string().alphanum().min(3).max(50).required()
});

export const validateCreateSite = (req, res, next) => {
  const { error, value } = siteSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
};

export const validateUpdateSite = (req, res, next) => {
  const { error, value } = updateSiteSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
};

export const validateSubdomain = (req, res, next) => {
  const { error, value } = subdomainSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
};

export const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files provided'
    });
  }
  next();
};

