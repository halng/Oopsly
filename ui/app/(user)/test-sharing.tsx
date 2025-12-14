import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Users,
  Share2,
  Link,
  Mail,
  MessageSquare,
  Copy,
  Check,
  UserPlus,
  Lock,
  Globe,
  Plus,
  Search,
} from "lucide-react-native";

const TestSharingScreen = () => {
  const router = useRouter();
  const [sharingMethod, setSharingMethod] = useState("link");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState([
    { id: "1", name: "Sarah Johnson", email: "sarah@example.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlcnxlbnwwfHwwfHx8MA%3D%3D" },
    { id: "2", name: "Michael Chen", email: "michael@example.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlcnxlbnwwfHwwfHx8MA%3D%3D" },
    { id: "3", name: "Emma Rodriguez", email: "emma@example.com", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZGFyY2h8OHx8dXNlcnxlbnwwfHwwfHx8MA%3D%3D" },
  ]);
  const [newCollaborator, setNewCollaborator] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock sharing link
  const sharingLink = "https://testmaster.pro/share/abc123xyz";

  // Handle contact selection
  const toggleContactSelection = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  // Add new collaborator
  const handleAddCollaborator = () => {
    if (!newCollaborator.trim()) {
      Alert.alert("Invalid Input", "Please enter a valid email address");
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCollaborator)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    
    // Check if already added
    if (collaborators.some(c => c.email === newCollaborator)) {
      Alert.alert("Already Added", "This collaborator is already on the list");
      return;
    }
    
    const newCollab = {
      id: String(collaborators.length + 1),
      name: newCollaborator.split("@")[0],
      email: newCollaborator,
      avatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D"
    };
    
    setCollaborators([...collaborators, newCollab]);
    setNewCollaborator("");
  };

  // Copy sharing link to clipboard
  const copyToClipboard = () => {
    // In a real app, we would use Clipboard API
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert("Copied!", "Sharing link copied to clipboard");
  };

  // Share via different methods
  const shareViaMethod = (method: string) => {
    switch (method) {
      case "link":
        Alert.alert(
          "Share via Link",
          "Anyone with this link can access the test. You can revoke access anytime.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Copy Link", onPress: copyToClipboard }
          ]
        );
        break;
      case "email":
        Alert.alert(
          "Share via Email",
          "Send an invitation directly to selected contacts",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Send Invitations", onPress: () => Alert.alert("Invitations Sent", "Email invitations have been sent to your contacts") }
          ]
        );
        break;
      case "message":
        Alert.alert(
          "Share via Message",
          "Send an invitation via messaging apps",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Send Messages", onPress: () => Alert.alert("Messages Sent", "Invitation messages have been sent") }
          ]
        );
        break;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            Share Test
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Sharing Method Selector */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            How would you like to share?
          </Text>
          
          <View className="flex-row gap-3 mb-6">
            {[
              { id: "link", label: "Share Link", icon: <Link size={20} color="#4F46E5" /> },
              { id: "email", label: "Email", icon: <Mail size={20} color="#10B981" /> },
              { id: "message", label: "Message", icon: <MessageSquare size={20} color="#8B5CF6" /> },
            ].map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSharingMethod(method.id)}
                className={`flex-1 py-4 rounded-lg items-center ${
                  sharingMethod === method.id
                    ? "bg-blue-50 border-2 border-blue-500"
                    : "bg-gray-50 border-2 border-gray-200"
                }`}
              >
                <View className="mb-2">{method.icon}</View>
                <Text
                  className={
                    sharingMethod === method.id
                      ? "text-blue-700 font-bold"
                      : "text-gray-600"
                  }
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Link Sharing */}
          {sharingMethod === "link" && (
            <View>
              <Text className="text-gray-700 mb-3">
                Share this link with anyone you want to collaborate with:
              </Text>
              
              <View className="flex-row items-center bg-gray-100 rounded-lg p-3 mb-4">
                <Text className="flex-1 text-gray-700 text-sm" numberOfLines={1}>
                  {sharingLink}
                </Text>
                <TouchableOpacity 
                  onPress={copyToClipboard}
                  className="ml-2 bg-blue-500 rounded-lg p-2"
                >
                  {copied ? (
                    <Check size={20} color="white" />
                  ) : (
                    <Copy size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-700 font-medium">Access Permissions</Text>
                <View className="flex-row items-center">
                  <Globe size={16} color="#4F46E5" />
                  <Text className="text-blue-600 ml-1">Public</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={shareViaMethod.bind(null, "link")}
                className="bg-blue-600 py-3 rounded-lg items-center"
              >
                <Text className="text-white font-bold">Copy & Share</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Email/Message Sharing */}
          {(sharingMethod === "email" || sharingMethod === "message") && (
            <View>
              <Text className="text-gray-700 mb-3">
                Select contacts to invite:
              </Text>
              
              <View className="flex-row items-center bg-gray-100 rounded-lg p-3 mb-4">
                <Search size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Search contacts..."
                  className="flex-1 ml-2 text-gray-700"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              
              <View className="gap-3 mb-6 max-h-60">
                {collaborators
                  .filter(collab => 
                    collab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    collab.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((collaborator) => (
                    <TouchableOpacity
                      key={collaborator.id}
                      onPress={() => toggleContactSelection(collaborator.id)}
                      className={`flex-row items-center p-3 rounded-lg ${
                        selectedContacts.includes(collaborator.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <Image
                        source={{ uri: collaborator.avatar }}
                        className="w-10 h-10 rounded-full"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="font-medium text-gray-800">
                          {collaborator.name}
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {collaborator.email}
                        </Text>
                      </View>
                      <View
                        className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
                          selectedContacts.includes(collaborator.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedContacts.includes(collaborator.id) && (
                          <Check size={16} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                }
                
                <View className="flex-row items-center p-3 bg-gray-50 rounded-lg mt-2">
                  <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                    <UserPlus size={20} color="#4B5563" />
                  </View>
                  <TextInput
                    placeholder="Add email address..."
                    className="flex-1 ml-3 text-gray-700"
                    value={newCollaborator}
                    onChangeText={setNewCollaborator}
                    keyboardType="email-address"
                  />
                  <TouchableOpacity 
                    onPress={handleAddCollaborator}
                    className="bg-blue-500 rounded-lg p-2"
                  >
                    <Plus size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={shareViaMethod.bind(null, sharingMethod)}
                disabled={selectedContacts.length === 0}
                className={`py-3 rounded-lg items-center ${
                  selectedContacts.length > 0
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >
                <Text className={
                  selectedContacts.length > 0
                    ? "text-white font-bold"
                    : "text-gray-500 font-bold"
                }>
                  Send Invitations ({selectedContacts.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Collaborative Creation */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <Users size={24} color="#4F46E5" />
            <Text className="text-lg font-bold text-gray-800 ml-2">
              Collaborative Creation
            </Text>
          </View>
          
          <Text className="text-gray-600 mb-4">
            Invite others to help create and edit this test with you:
          </Text>
          
          <View className="flex-row items-center bg-blue-50 rounded-lg p-4 mb-4">
            <Lock size={16} color="#3B82F6" />
            <Text className="text-blue-800 ml-2">
              Only invited collaborators can edit
            </Text>
          </View>
          
          <View className="flex-row gap-3">
            <View className="flex-row items-center bg-gray-100 rounded-lg p-3 flex-1">
              <Text className="text-gray-700">3 collaborators</Text>
            </View>
            
            <TouchableOpacity className="bg-blue-600 rounded-lg p-3">
              <UserPlus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Sharing Tips */}
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">
            Sharing Tips
          </Text>
          
          <View className="gap-3">
            {[
              "Set expiration dates for links to maintain security",
              "Track who accesses your shared tests",
              "Enable editing permissions selectively",
              "Revoke access at any time"
            ].map((tip, index) => (
              <View key={index} className="flex-row items-start">
                <View className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3" />
                <Text className="text-gray-600 flex-1">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View className="h-6" />
      </ScrollView>
    </View>
  );
};

export default TestSharingScreen;