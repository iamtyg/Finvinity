import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';

interface PrivacyPolicyScreenProps {
  navigation: any;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: June 2025</Text>
          
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.bodyText}>
            At Finvinity, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            mobile application.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.subSectionTitle}>Portfolio Data</Text>
          <Text style={styles.bodyText}>
            • Asset holdings and transaction history{'\n'}
            • Investment amounts and portfolio values{'\n'}
            • Asset categories and purchase dates{'\n'}
            • Notes and tags you add to your investments
          </Text>

          <Text style={styles.subSectionTitle}>Device Information</Text>
          <Text style={styles.bodyText}>
            • Device type and operating system{'\n'}
            • App version and usage analytics{'\n'}
            • Crash reports and performance data{'\n'}
            • General location (country/region)
          </Text>

          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.bodyText}>
            We use the information we collect to:{'\n\n'}
            • Provide and maintain our portfolio tracking services{'\n'}
            • Calculate investment performance and analytics{'\n'}
            • Sync your data across devices (when enabled){'\n'}
            • Improve app functionality and user experience{'\n'}
            • Send important updates about your portfolio{'\n'}
            • Provide customer support when requested
          </Text>

          <Text style={styles.sectionTitle}>Data Storage and Security</Text>
          <Text style={styles.bodyText}>
            Your portfolio data is stored locally on your device by default. When cloud backup is enabled, 
            data is encrypted and stored securely using industry-standard encryption protocols. We implement 
            appropriate technical and organizational measures to protect your information against unauthorized 
            access, alteration, disclosure, or destruction.
          </Text>

          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.bodyText}>
            We do not sell, trade, or rent your personal information to third parties. We may share your 
            information only in the following circumstances:{'\n\n'}
            • With your explicit consent{'\n'}
            • To comply with legal obligations{'\n'}
            • To protect our rights and prevent fraud{'\n'}
            • With service providers who assist in app functionality (under strict confidentiality agreements)
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.bodyText}>
            You have the right to:{'\n\n'}
            • Access your personal data{'\n'}
            • Correct inaccurate information{'\n'}
            • Delete your account and data{'\n'}
            • Export your portfolio data{'\n'}
            • Opt-out of non-essential communications{'\n'}
            • Withdraw consent for data processing
          </Text>

          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.bodyText}>
            Finvinity may integrate with third-party services for market data and analytics. These services 
            have their own privacy policies, and we encourage you to review them. We are not responsible 
            for the privacy practices of these third-party services.
          </Text>

          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.bodyText}>
            Our app is not intended for children under 13 years of age. We do not knowingly collect 
            personal information from children under 13. If you believe we have collected information 
            from a child under 13, please contact us immediately.
          </Text>

          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.bodyText}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by 
            posting the new Privacy Policy in the app and updating the "Last updated" date. Your continued 
            use of the app after changes constitute acceptance of the new policy.
          </Text>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.bodyText}>
            If you have any questions about this Privacy Policy or our data practices, please contact us at:{'\n\n'}
            Email: finvinityapp@gmail.com{'\n'}
            Developer: Tahsin Gültekin{'\n'}
            Location: Istanbul, Turkey{'\n\n'}
            Finvinity Support Team{'\n'}
            Independent Developer{'\n'}
            Istanbul, Turkey
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  section: {
    padding: spacing.lg,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  subSectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
});

export default PrivacyPolicyScreen; 