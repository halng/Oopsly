import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Check,
  Star,
  Zap,
  Crown,
  Users,
  FileText,
  BarChart3,
  Clock,
  Download,
  Trophy,
} from "lucide-react-native";

const SubscribeScreen = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("annual");

  // Pricing plans data
  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "5 subjects",
        "100 flashcards per subject",
        "Basic spaced repetition",
        "Limited AI features",
      ],
      cta: "Current Plan",
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: selectedPlan === "monthly" ? "$7.99" : "$5.99",
      period: selectedPlan === "monthly" ? "per month" : "per month, billed annually",
      description: "Unlock full learning potential",
      features: [
        "Unlimited subjects",
        "Unlimited flashcards",
        "Advanced spaced repetition",
        "Full AI features",
        "Statistics dashboard",
        "Offline mode",
        "Priority support",
      ],
      cta: "Upgrade to Pro",
      popular: true,
    },
    {
      id: "student",
      name: "Student",
      price: selectedPlan === "monthly" ? "$4.99" : "$3.99",
      period: selectedPlan === "monthly" ? "per month" : "per month, billed annually",
      description: "Special discount for students",
      features: [
        "10 subjects",
        "Unlimited flashcards",
        "Advanced spaced repetition",
        "Basic AI features",
        "Statistics dashboard",
      ],
      cta: "Get Student Plan",
      popular: false,
    },
  ];

  // Benefits data
  const benefits = [
    {
      icon: <Zap size={24} color="#6366F1" />,
      title: "Enhanced Learning",
      description: "AI-powered flashcards adapt to your learning pace",
    },
    {
      icon: <BarChart3 size={24} color="#10B981" />,
      title: "Detailed Analytics",
      description: "Track your progress with comprehensive statistics",
    },
    {
      icon: <Download size={24} color="#F59E0B" />,
      title: "Offline Access",
      description: "Study anytime, anywhere without internet",
    },
    {
      icon: <Users size={24} color="#8B5CF6" />,
      title: "Community",
      description: "Join study groups and share resources",
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4F46E5" />
            <Text className="text-indigo-600 font-medium ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Subscription</Text>
          <View className="w-6" /> {/* Spacer for alignment */}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Hero Section */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-3">
              <Crown size={32} color="#6366F1" fill="#6366F1" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 text-center">
              Unlock Your Full Potential
            </Text>
            <Text className="text-gray-600 text-center mt-2">
              Upgrade to access premium features and accelerate your learning
            </Text>
          </View>

          {/* Plan Toggle */}
          <View className="bg-gray-100 rounded-xl p-1 flex-row mt-4 mb-6">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center ${
                selectedPlan === "monthly" ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setSelectedPlan("monthly")}
            >
              <Text
                className={`font-medium ${
                  selectedPlan === "monthly" ? "text-gray-800" : "text-gray-500"
                }`}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center ${
                selectedPlan === "annual" ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setSelectedPlan("annual")}
            >
              <Text
                className={`font-medium ${
                  selectedPlan === "annual" ? "text-gray-800" : "text-gray-500"
                }`}
              >
                Annual
              </Text>
              <View className="bg-emerald-100 px-2 py-1 rounded-full mt-1">
                <Text className="text-emerald-700 text-xs font-medium">Save 25%</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Plans */}
          <View className="gap-4">
            {plans.map((plan) => (
              <View
                key={plan.id}
                className={`rounded-xl border-2 p-5 relative ${
                  plan.popular
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.popular && (
                  <View className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 px-4 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">MOST POPULAR</Text>
                  </View>
                )}
                
                <View className="mb-4">
                  <View className="flex-row justify-between items-start">
                    <View>
                      <Text className="text-lg font-bold text-gray-800">{plan.name}</Text>
                      <Text className="text-gray-600">{plan.description}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-2xl font-bold text-gray-800">{plan.price}</Text>
                      <Text className="text-gray-500 text-sm">{plan.period}</Text>
                    </View>
                  </View>
                </View>

                <View className="mb-5">
                  {plan.features.map((feature, index) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <Check size={18} color="#10B981" className="mr-2" />
                      <Text className="text-gray-700">{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  className={`py-3 rounded-xl items-center ${
                    plan.popular
                      ? "bg-indigo-600"
                      : plan.id === "basic"
                      ? "bg-gray-200"
                      : "bg-indigo-100"
                  }`}
                  disabled={plan.id === "basic"}
                >
                  <Text
                    className={`font-bold ${
                      plan.popular
                        ? "text-white"
                        : plan.id === "basic"
                        ? "text-gray-500"
                        : "text-indigo-700"
                    }`}
                  >
                    {plan.cta}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            Why Upgrade?
          </Text>
          
          <View className="gap-5">
            {benefits.map((benefit, index) => (
              <View key={index} className="flex-row">
                <View className="mr-4 mt-1">
                  {benefit.icon}
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-800 mb-1">{benefit.title}</Text>
                  <Text className="text-gray-600">{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            What Students Say
          </Text>
          
          <View className="gap-4">
            <View className="bg-indigo-50 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-indigo-200 items-center justify-center mr-3">
                  <Text className="text-indigo-800 font-bold">SJ</Text>
                </View>
                <View>
                  <Text className="font-bold text-gray-800">Sarah Johnson</Text>
                  <Text className="text-gray-600 text-sm">Medical Student</Text>
                </View>
                <View className="flex-row ml-auto">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} color="#F59E0B" fill="#F59E0B" />
                  ))}
                </View>
              </View>
              <Text className="text-gray-700 italic">
                "Osmosis Pro helped me ace my anatomy exams! The spaced repetition system really works."
              </Text>
            </View>
            
            <View className="bg-emerald-50 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-emerald-200 items-center justify-center mr-3">
                  <Text className="text-emerald-800 font-bold">MR</Text>
                </View>
                <View>
                  <Text className="font-bold text-gray-800">Mike Rodriguez</Text>
                  <Text className="text-gray-600 text-sm">Engineering Student</Text>
                </View>
                <View className="flex-row ml-auto">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} color="#F59E0B" fill="#F59E0B" />
                  ))}
                </View>
              </View>
              <Text className="text-gray-700 italic">
                "The AI-generated flashcards saved me hours of prep time. Worth every penny!"
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            Frequently Asked Questions
          </Text>
          
          <View className="gap-4">
            <View>
              <Text className="font-bold text-gray-800">Can I cancel anytime?</Text>
              <Text className="text-gray-600 mt-1">
                Yes, you can cancel your subscription at any time with no cancellation fees.
              </Text>
            </View>
            
            <View>
              <Text className="font-bold text-gray-800">Do you offer student discounts?</Text>
              <Text className="text-gray-600 mt-1">
                Absolutely! We offer special pricing for verified students. Simply upload your student ID.
              </Text>
            </View>
            
            <View>
              <Text className="font-bold text-gray-800">What payment methods do you accept?</Text>
              <Text className="text-gray-600 mt-1">
                We accept all major credit cards, PayPal, and Apple Pay.
              </Text>
            </View>
          </View>
        </View>
        
        <View className="h-6" />
      </ScrollView>
    </View>
  );
};

export default SubscribeScreen;