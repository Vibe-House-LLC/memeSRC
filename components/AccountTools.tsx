"use client";

import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Schema } from '@/amplify/data/resource';
import { Save, Mail, Loader, User, Calendar, Shield } from "lucide-react";
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Logout from './Logout';

const client = generateClient<Schema>();

// ProfileForm types and component
type ProfileFormData = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  stripeCustomerId?: string;
  createdAt?: string;
};

export const UpdateProfileForm: React.FC<{ initialData: ProfileFormData }> = ({ initialData }) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchLatestProfileData = async (id: string) => {
    try {
      const { data: profile, errors } = await client.models.Profile.get({ id });
      if (errors) {
        throw new Error(errors.join(', '));
      }
      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: updatedProfile, errors } = await client.models.Profile.update({
        id: initialData.id,
        firstName: formData.firstName ?? undefined,
        lastName: formData.lastName ?? undefined,
      });
      if (errors) {
        throw new Error(errors.join(', '));
      }
      
      const latestProfileData = await fetchLatestProfileData(initialData.id);
      if (latestProfileData) {
        setFormData({
          id: latestProfileData.id,
          firstName: latestProfileData.firstName ?? undefined,
          lastName: latestProfileData.lastName ?? undefined,
        });
      }
      
      toast.success('Profile updated successfully!');
      router.replace('/account');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl overflow-hidden mb-6 p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Edit Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label htmlFor="firstName" className="text-gray-400 mb-1">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName || ''}
            onChange={handleChange}
            className="bg-gray-800 text-white p-2 rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="lastName" className="text-gray-400 mb-1">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName || ''}
            onChange={handleChange}
            className="bg-gray-800 text-white p-2 rounded"
          />
        </div>
      </div>
      <button 
        type="submit" 
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded flex items-center disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader size={20} className="mr-2 animate-spin" />
        ) : (
          <Save size={20} className="mr-2" />
        )}
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
};

// ChangeEmailForm types and component
type ChangeEmailFormProps = {
  currentEmail: string;
};

export const UpdateEmailForm: React.FC<ChangeEmailFormProps> = ({ currentEmail }) => {
  const [formData, setFormData] = useState({
    newEmail: '',
    confirmEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Placeholder for email change logic
    setTimeout(() => {
      toast.success('TODO: email ');
      setIsSubmitting(false);
      setFormData({ newEmail: '', confirmEmail: '' });
    }, 2000);
  };

  const isFormValid = formData.newEmail && 
                      formData.newEmail === formData.confirmEmail && 
                      formData.newEmail !== currentEmail;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl overflow-hidden mb-6 p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Change Email</h2>
      <div className="flex flex-col mb-4">
        <label className="text-gray-400 mb-1">Current Email</label>
        <input
          type="email"
          value={currentEmail}
          disabled
          className="bg-gray-800 text-gray-500 p-2 rounded"
        />
      </div>
      <div className="flex flex-col mb-4">
        <label htmlFor="newEmail" className="text-gray-400 mb-1">New Email</label>
        <input
          type="email"
          id="newEmail"
          name="newEmail"
          value={formData.newEmail}
          onChange={handleChange}
          className="bg-gray-800 text-white p-2 rounded"
          required
        />
      </div>
      <div className="flex flex-col mb-4">
        <label htmlFor="confirmEmail" className="text-gray-400 mb-1">Confirm New Email</label>
        <input
          type="email"
          id="confirmEmail"
          name="confirmEmail"
          value={formData.confirmEmail}
          onChange={handleChange}
          className="bg-gray-800 text-white p-2 rounded"
          required
        />
      </div>
      {formData.newEmail && formData.confirmEmail && formData.newEmail !== formData.confirmEmail && (
        <p className="text-red-500 mb-4">Emails do not match</p>
      )}
      {formData.newEmail && formData.newEmail === currentEmail && (
        <p className="text-red-500 mb-4">New email must be different from the current email</p>
      )}
      <button 
        type="submit" 
        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center disabled:opacity-50"
        disabled={isSubmitting || !isFormValid}
      >
        {isSubmitting ? (
          <Loader size={20} className="mr-2 animate-spin" />
        ) : (
          <Mail size={20} className="mr-2" />
        )}
        {isSubmitting ? 'Submitting...' : 'Change Email'}
      </button>
    </form>
  );
};

// Update the component definition
export const AccountHeader: React.FC<{ profile: ProfileFormData }> = ({ profile }) => {
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden mb-8 p-8">
      <div className="flex items-center mb-6">
        <div className="bg-blue-600 rounded-full p-4 mr-5">
          <User size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold">
          Welcome, <span className="text-blue-400">{profile.firstName}</span>!
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-700 pb-10 mb-6 pl-4 pt-2">
        <div className="flex items-center">
          <User size={28} className="text-gray-400 mr-4" />
          <div>
            <p className="text-sm text-gray-400 mb-1">Full Name</p>
            <p className="font-medium">
              {`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Not set'}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <Mail size={28} className="text-gray-400 mr-4" />
          <div>
            <p className="text-sm text-gray-400 mb-1">Email Address</p>
            <p className="font-medium">{profile.email ?? 'Not set'}</p>
          </div>
        </div>
        {profile.stripeCustomerId && (
          <div className="flex items-center">
            <Shield size={28} className="text-gray-400 mr-4" />
            <div>
              <p className="text-sm text-gray-400 mb-1">Stripe ID</p>
              <p className="font-medium">{profile.stripeCustomerId}</p>
            </div>
          </div>
        )}
        {profile.createdAt && (
          <div className="flex items-center">
            <Calendar size={28} className="text-gray-400 mr-4" />
            <div>
              <p className="text-sm text-gray-400 mb-1">Member Since</p>
              <p className="font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <Logout />
      </div>
    </div>
  );
};