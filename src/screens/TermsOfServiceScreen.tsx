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

interface TermsOfServiceScreenProps {
  navigation: any;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: June 2025</Text>
          
          <Text style={styles.sectionTitle}>Agreement to Terms</Text>
          <Text style={styles.bodyText}>
            By downloading, installing, or using the Finvinity mobile application ("App"), you agree to be bound by 
            these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our App.
          </Text>

          <Text style={styles.sectionTitle}>Description of Service</Text>
          <Text style={styles.bodyText}>
            Finvinity is a personal portfolio tracking application that allows users to:{'\n\n'}
            • Track investment portfolios and asset performance{'\n'}
            • Monitor market prices and portfolio values{'\n'}
            • Record transactions and investment history{'\n'}
            • View analytics and performance metrics{'\n'}
            • Export and backup portfolio data
          </Text>

          <Text style={styles.sectionTitle}>User Responsibilities</Text>
          <Text style={styles.bodyText}>
            You are responsible for:{'\n\n'}
            • Providing accurate portfolio and transaction information{'\n'}
            • Maintaining the security of your device and app data{'\n'}
            • Using the App in compliance with applicable laws{'\n'}
            • Not sharing sensitive financial information inappropriately{'\n'}
            • Regularly backing up your important data{'\n'}
            • Keeping the App updated to the latest version
          </Text>

          <Text style={styles.sectionTitle}>Prohibited Uses</Text>
          <Text style={styles.bodyText}>
            You may not use Finvinity to:{'\n\n'}
            • Engage in any illegal activities{'\n'}
            • Share or distribute malicious content{'\n'}
            • Attempt to reverse engineer the App{'\n'}
            • Use the App to provide financial advice to others{'\n'}
            • Violate any applicable laws or regulations{'\n'}
            • Interfere with the App's security features
          </Text>

          <Text style={styles.sectionTitle}>Financial Disclaimer</Text>
          <Text style={styles.bodyText}>
            Finvinity is a portfolio tracking tool only. It does not provide:{'\n\n'}
            • Financial, investment, or tax advice{'\n'}
            • Recommendations to buy or sell securities{'\n'}
            • Real-time market data guarantees{'\n'}
            • Investment performance predictions{'\n\n'}
            All investment decisions are your responsibility. Please consult qualified financial professionals 
            before making investment decisions.
          </Text>

          <Text style={styles.sectionTitle}>Data Accuracy</Text>
          <Text style={styles.bodyText}>
            While we strive to provide accurate market data, we cannot guarantee the completeness or accuracy 
            of information displayed in the App. Market prices may be delayed and should not be used for 
            real-time trading decisions. Always verify important information through official sources.
          </Text>

          <Text style={styles.sectionTitle}>Account Termination</Text>
          <Text style={styles.bodyText}>
            You may stop using the App at any time. We reserve the right to suspend or terminate access to 
            the App if you violate these Terms or engage in prohibited activities. Upon termination, your 
            rights to use the App cease immediately.
          </Text>

          <Text style={styles.sectionTitle}>Intellectual Property</Text>
          <Text style={styles.bodyText}>
            The Finvinity App, including its design, features, and content, is protected by intellectual property 
            laws. You may not copy, modify, distribute, or create derivative works based on the App without 
            explicit permission.
          </Text>

          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.bodyText}>
            To the maximum extent permitted by law, Finvinity and its developer shall not be liable for any 
            indirect, incidental, special, or consequential damages arising from your use of the App, including 
            but not limited to financial losses or investment decisions.
          </Text>

          <Text style={styles.sectionTitle}>Updates and Modifications</Text>
          <Text style={styles.bodyText}>
            We may update the App and these Terms from time to time. Continued use of the App after updates 
            constitutes acceptance of the modified Terms. We recommend reviewing these Terms periodically for changes.
          </Text>

          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.bodyText}>
            The App may integrate with third-party services for market data and other features. These services 
            are governed by their own terms and privacy policies. We are not responsible for third-party service 
            availability or performance.
          </Text>

          <Text style={styles.sectionTitle}>Governing Law</Text>
          <Text style={styles.bodyText}>
            These Terms are governed by and construed in accordance with the laws of Turkey. 
            Any disputes arising from these Terms or your use of the App shall be resolved in the 
            appropriate courts of Istanbul, Turkey.
          </Text>

          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.bodyText}>
            For questions about these Terms of Service, please contact us at:{'\n\n'}
            Email: finvinityapp@gmail.com{'\n'}
            Developer: Tahsin Gültekin{'\n'}
            Location: Istanbul, Turkey{'\n\n'}
            Finvinity Legal Team{'\n'}
            Independent Developer{'\n'}
            Istanbul, Turkey
          </Text>

          <Text style={styles.sectionTitle}>Acceptance</Text>
          <Text style={styles.bodyText}>
            By using Finvinity, you acknowledge that you have read, understood, and agree to be bound by these 
            Terms of Service and our Privacy Policy.
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
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
});

export default TermsOfServiceScreen; 