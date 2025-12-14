import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Chrome,
} from "lucide-react-native";

const AuthScreen = () => {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    // Simple validation
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (isSignUp) {
      if (!formData.name) {
        Alert.alert("Error", "Please enter your name");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }

      if (formData.password.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters");
        return;
      }
    }

    // In a real app, this would be an API call
    console.log(isSignUp ? "Signing up..." : "Logging in...", formData);

    // Navigate to the main app after successful auth
    router.replace("/");
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1">
        {/* Background Image */}
        <View className="relative h-64">
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1515073838964-4d4d56a58b21?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8U3R1ZGVudCUyMGxlYXJuZXIlMjBwdXBpbCUyMGVkdWNhdGlvbnxlbnwwfHwwfHx8MA%3D%3D",
            }}
            className="w-full h-64"
            resizeMode="cover"
          />

          {/* Back Button */}
          <TouchableOpacity
            className="absolute top-12 left-4 bg-white/80 rounded-full p-2"
            onPress={() => router.push("/")}
          >
            <ArrowLeft size={24} color="#4F46E5" />
          </TouchableOpacity>

          <View className="absolute inset-0 bg-indigo-900/50" />

          <View className="absolute bottom-6 left-6">
            <Text className="text-white text-3xl font-bold">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text className="text-white text-lg mt-1">
              {isSignUp
                ? "Join us to enhance your learning journey"
                : "Sign in to continue your studies"}
            </Text>
          </View>
        </View>

        <View className="px-6 py-8 bg-white rounded-t-3xl -mt-8">
          {/* Toggle between Sign In and Sign Up */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center ${
                !isSignUp ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setIsSignUp(false)}
            >
              <Text
                className={`font-medium ${
                  !isSignUp ? "text-indigo-600" : "text-gray-500"
                }`}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center ${
                isSignUp ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setIsSignUp(true)}
            >
              <Text
                className={`font-medium ${
                  isSignUp ? "text-indigo-600" : "text-gray-500"
                }`}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Field (only for Sign Up) */}
          {isSignUp && (
            <View className="mb-5">
              <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3">
                <User size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-3 text-gray-800"
                  placeholder="Full Name"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange("name", value)}
                />
              </View>
            </View>
          )}

          {/* Email Field */}
          <View className="mb-5">
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3">
              <Mail size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
              />
            </View>
          </View>

          {/* Password Field */}
          <View className="mb-5">
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3">
              <Lock size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            {isSignUp && (
              <Text className="text-gray-500 text-xs mt-2 ml-2">
                Must be at least 6 characters
              </Text>
            )}
          </View>

          {/* Confirm Password Field (only for Sign Up) */}
          {isSignUp && (
            <View className="mb-6">
              <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3">
                <Lock size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-3 text-gray-800"
                  placeholder="Confirm Password"
                  secureTextEntry={!showConfirmPassword}
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    handleInputChange("confirmPassword", value)
                  }
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot Password (only for Sign In) */}
          {!isSignUp && (
            <TouchableOpacity className="mb-6 self-end">
              <Text className="text-indigo-600 font-medium">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-4 items-center mb-4"
            onPress={handleSubmit}
          >
            <Text className="text-white font-bold text-lg">
              {isSignUp ? "Create Account" : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-4 text-gray-500">or continue with</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 mb-6"
            onPress={() => console.log("Google Sign In pressed")}
          >
            <Chrome size={20} color="#4285F4" />
            <Text className="ml-3 font-medium text-gray-700">
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </Text>
          </TouchableOpacity>

          {/* Terms and Conditions (only for Sign Up) */}
          {isSignUp && (
            <View className="mb-6">
              <Text className="text-gray-500 text-center text-sm">
                By creating an account, you agree to our{" "}
                <Text className="text-indigo-600">Terms of Service</Text> and{" "}
                <Text className="text-indigo-600">Privacy Policy</Text>
              </Text>
            </View>
          )}

          {/* Toggle Auth Mode */}
          <View className="flex-row justify-center">
            <Text className="text-gray-600">
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text className="text-indigo-600 font-medium">
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;
