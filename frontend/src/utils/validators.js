// src/utils/validators.js
import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required'),
});

export const registerSchema = Yup.object({
  fullName: Yup.string()
    .min(3, 'Full name must be at least 3 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^\+?[0-9]{10,15}$/, 'Phone number must be between 10-15 digits')
    .required('Phone number is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  terms: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required(),
});

export const reviewSchema = Yup.object({
  rating: Yup.number().min(1).max(5).required('Rating is required'),
  text: Yup.string().min(20, 'Write at least 20 characters').max(2000).required(),
});

export const addressSchema = Yup.object({
  label: Yup.string().required('Label is required'),
  street: Yup.string().required('Street is required'),
  city: Yup.string().required('City is required'),
  state: Yup.string().required('State is required'),
  zipCode: Yup.string()
    .matches(/^[0-9]{5,6}$/, 'Invalid PIN/ZIP code')
    .required('ZIP code is required'),
});
