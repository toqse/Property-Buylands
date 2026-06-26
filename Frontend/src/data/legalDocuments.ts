export type LegalSubsection = {
  label: string;
  items: string[];
};

export type LegalSection = {
  number: number;
  title: string;
  paragraphs?: string[];
  paragraphsAfter?: string[];
  items?: string[];
  subsections?: LegalSubsection[];
};

export type LegalDocument = {
  slug: string;
  pageTitle: string;
  heading: string;
  heroEyebrow: string;
  lastUpdated: string;
  sections: LegalSection[];
  closingParagraph?: string;
};

export const PRIVACY_POLICY: LegalDocument = {
  slug: "privacy-policy",
  pageTitle: "Privacy Policy",
  heading: "Privacy Policy",
  heroEyebrow: "Legal",
  lastUpdated: "June 19, 2026",
  sections: [
    {
      number: 1,
      title: "Introduction",
      paragraphs: [
        'Buy Lands India ("Buy Lands India", "we", "us", or "our") operates the website www.buylandsindia.com and related services (collectively, the "Platform"), which connects buyers, sellers, tenants, and landlords of land and real estate properties across India.',
        "We are committed to protecting your privacy and handling your personal data responsibly. This Privacy Policy explains what information we collect, how we use it, who we share it with, and the rights available to you. It is published in compliance with the Information Technology Act, 2000, the rules made thereunder, and the Digital Personal Data Protection Act, 2023 (DPDP Act).",
        "By accessing or using the Platform, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Platform.",
      ],
    },
    {
      number: 2,
      title: "Information We Collect",
      subsections: [
        {
          label: "a) Information You Provide Directly",
          items: [
            "Account details: name, email address, phone number, password, and profile information when you register.",
            "Property listing details: property type, location, address, price, area, photographs, documents, descriptions, and ownership details submitted when you list a property.",
            "Enquiry and contact data: messages, enquiries, site-visit requests, and communications you send to us or to other users.",
            "Transactional and KYC information: where required, identity and verification details to confirm ownership or authenticity of a listing.",
          ],
        },
        {
          label: "b) Information Collected Automatically",
          items: [
            "Device and browser information, IP address, operating system, and unique device identifiers.",
            "Usage data such as pages viewed, searches performed, properties saved or shortlisted, and time spent on the Platform.",
            "Cookies and similar technologies (see Section 8).",
          ],
        },
        {
          label: "c) Information from Third Parties",
          items: [
            "Information from authentication or login providers if you choose to sign in through them.",
            "Information from partners, agents, or service providers who assist us in operating the Platform.",
          ],
        },
      ],
    },
    {
      number: 3,
      title: "How We Use Your Information",
      paragraphs: ["We use your information to:"],
      items: [
        "Create and manage your account and verify your identity.",
        "Publish and display your property listings to interested users.",
        "Connect buyers, sellers, tenants, and landlords and facilitate enquiries and communications.",
        "Personalise search results, recommendations, and content.",
        "Process requests, respond to queries, and provide customer support.",
        "Send service-related notifications, updates, and (with your consent) marketing communications.",
        "Detect, prevent, and address fraud, security issues, and prohibited or unlawful activity.",
        "Improve the Platform, conduct analytics, and develop new features.",
        "Comply with legal obligations and enforce our Terms of Service.",
      ],
    },
    {
      number: 4,
      title: "Legal Basis for Processing",
      paragraphs: [
        "We process your personal data on the basis of your consent, the necessity to perform a contract or service you have requested, our legitimate business interests, and compliance with applicable legal obligations.",
      ],
    },
    {
      number: 5,
      title: "How We Share Your Information",
      paragraphs: ["We do not sell your personal data. We may share information:"],
      items: [
        "With other users: when you publish a listing or make an enquiry, relevant contact and property details are shared with the counterparty to facilitate the transaction.",
        "With service providers: hosting, analytics, payment processing, communication (SMS/email), and customer-support vendors who act on our instructions.",
        "With business partners and agents: where necessary to help complete a property transaction you have initiated.",
        "For legal reasons: to comply with law, court orders, or lawful requests by government authorities, and to protect our rights, users, and the public.",
        "In business transfers: in connection with a merger, acquisition, or sale of assets, subject to this Privacy Policy.",
      ],
    },
    {
      number: 6,
      title: "Data Retention",
      paragraphs: [
        "We retain your personal data only for as long as necessary to fulfil the purposes described in this Policy, to comply with legal, tax, or regulatory requirements, and to resolve disputes and enforce our agreements. When data is no longer required, we securely delete or anonymise it.",
      ],
    },
    {
      number: 7,
      title: "Data Security",
      paragraphs: [
        "We implement reasonable technical and organisational security measures — including encryption in transit, access controls, and secure infrastructure — to protect your personal data against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      ],
    },
    {
      number: 8,
      title: "Cookies and Tracking Technologies",
      paragraphs: [
        "We use cookies and similar technologies to keep you signed in, remember preferences, analyse traffic, and improve your experience. You can control or disable cookies through your browser settings, though some features of the Platform may not function properly without them.",
      ],
    },
    {
      number: 9,
      title: "Your Rights",
      paragraphs: ["Subject to applicable law, you have the right to:"],
      items: [
        "Access the personal data we hold about you.",
        "Correct or update inaccurate or incomplete data.",
        "Withdraw consent or request deletion of your data.",
        "Object to or restrict certain processing.",
        "Lodge a grievance with our Grievance Officer (Section 12) or the relevant Data Protection Authority.",
      ],
      paragraphsAfter: [
        "To exercise these rights, contact us using the details in Section 12. You can also edit most of your information directly through your account settings.",
      ],
    },
    {
      number: 10,
      title: "Third-Party Links",
      paragraphs: [
        "The Platform may contain links to third-party websites or services. We are not responsible for their privacy practices, and we encourage you to review their policies before sharing your information.",
      ],
    },
    {
      number: 11,
      title: "Children's Privacy",
      paragraphs: [
        "The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that we have collected such data, we will take steps to delete it.",
      ],
    },
    {
      number: 12,
      title: "Grievance Officer and Contact",
      paragraphs: [
        "In accordance with the Information Technology Act, 2000 and the DPDP Act, 2023, you may contact our Grievance Officer for any questions, concerns, or complaints regarding your personal data:",
      ],
      items: [
        "Grievance Officer: [Name]",
        "Email: grievance@buylandsindia.com",
        "Phone: [Phone number]",
        "Address: [Registered office address]",
        "We will acknowledge and address grievances within the timelines prescribed under applicable law.",
      ],
    },
    {
      number: 13,
      title: "Changes to This Privacy Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. Material changes will be notified through the Platform or by email. Your continued use of the Platform after such changes constitutes acceptance of the revised Policy.",
      ],
    },
  ],
  closingParagraph:
    "This Privacy Policy is effective as of the date indicated above and supersedes all previous versions.",
};

export const TERMS_CONDITIONS: LegalDocument = {
  slug: "terms-conditions",
  pageTitle: "Terms & Conditions",
  heading: "Terms of Service",
  heroEyebrow: "Legal",
  lastUpdated: "June 19, 2026",
  sections: [
    {
      number: 1,
      title: "Acceptance of Terms",
      paragraphs: [
        'These Terms of Service ("Terms") govern your access to and use of the website www.buylandsindia.com and related services (collectively, the "Platform") operated by Buy Lands India ("we", "us", or "our"). By accessing, registering on, or using the Platform, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Platform.',
      ],
    },
    {
      number: 2,
      title: "About the Platform",
      paragraphs: [
        "Buy Lands India is an online marketplace that enables users to list, discover, buy, sell, or rent land and real estate properties across India. We act solely as an intermediary platform that connects buyers, sellers, tenants, and landlords. We are not a party to any transaction between users, are not a real estate broker or agent (unless expressly stated), and do not own, sell, or lease the properties listed.",
      ],
    },
    {
      number: 3,
      title: "Eligibility",
      paragraphs: [
        "You must be at least 18 years of age and legally capable of entering into a binding contract under the Indian Contract Act, 1872 to use the Platform. By using the Platform, you represent and warrant that you meet these requirements.",
      ],
    },
    {
      number: 4,
      title: "User Accounts",
      items: [
        "You must provide accurate, current, and complete information when creating an account.",
        "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.",
        "You must promptly notify us of any unauthorised use of your account.",
        "We may suspend or terminate accounts that contain false information or violate these Terms.",
      ],
    },
    {
      number: 5,
      title: "Listings and User Content",
      paragraphs: [
        "When you post a property listing, you represent that you are the owner or duly authorised to list the property, and that all information (including price, location, area, ownership, photographs, and documents) is accurate, current, and lawful.",
        "You retain ownership of the content you submit but grant Buy Lands India a non-exclusive, royalty-free, worldwide licence to host, display, reproduce, and distribute that content on the Platform for the purpose of operating and promoting the service.",
        "You are solely responsible for your listings and content. We may review, edit, reject, or remove any content at our discretion, but we are not obligated to monitor content.",
      ],
    },
    {
      number: 6,
      title: "Prohibited Conduct",
      paragraphs: ["You agree not to:"],
      items: [
        "Post false, misleading, fraudulent, or duplicate listings.",
        "List properties you do not own or are not authorised to list, or properties subject to legal disputes or encumbrances without disclosure.",
        "Infringe the intellectual property or other rights of any person.",
        "Post unlawful, defamatory, obscene, discriminatory, or offensive content.",
        "Use the Platform for spam, unsolicited marketing, or to harvest data of other users.",
        "Attempt to gain unauthorised access to the Platform, introduce malware, or disrupt its operation.",
        "Circumvent fees or use the Platform for any illegal purpose, including money laundering.",
      ],
    },
    {
      number: 7,
      title: "Property Transactions and Disclaimer",
      paragraphs: [
        "All negotiations, agreements, payments, due diligence, title verification, and transactions take place directly between users. Buy Lands India is not responsible for and does not guarantee the accuracy, legality, quality, safety, or availability of any listed property.",
        "We strongly advise users to independently verify property titles, ownership documents, approvals, encumbrances, and legal compliance, and to seek professional legal and financial advice before entering into any transaction.",
        "Buy Lands India shall not be liable for any loss, dispute, fraud, or damage arising from transactions or dealings between users.",
      ],
    },
    {
      number: 8,
      title: "Fees and Payments",
      paragraphs: [
        "Certain features of the Platform (such as premium listings, promotions, or subscriptions) may require payment. Applicable fees, taxes, and payment terms will be displayed before you make a purchase. Unless stated otherwise or required by law, fees paid are non-refundable.",
      ],
    },
    {
      number: 9,
      title: "Intellectual Property",
      paragraphs: [
        "The Platform, including its design, logos, trademarks, text, graphics, and software (excluding user-submitted content), is owned by or licensed to Buy Lands India and is protected by applicable intellectual property laws. You may not copy, reproduce, modify, distribute, or create derivative works without our prior written consent.",
      ],
    },
    {
      number: 10,
      title: "Third-Party Services and Links",
      paragraphs: [
        "The Platform may integrate or link to third-party services. We do not control and are not responsible for the content, products, or practices of any third parties, and your use of them is at your own risk and subject to their terms.",
      ],
    },
    {
      number: 11,
      title: "Disclaimer of Warranties",
      paragraphs: [
        'The Platform is provided on an "as is" and "as available" basis, without warranties of any kind, whether express or implied. We do not warrant that the Platform will be uninterrupted, error-free, secure, or that listings are accurate, complete, or reliable. To the maximum extent permitted by law, we disclaim all implied warranties.',
      ],
    },
    {
      number: 12,
      title: "Limitation of Liability",
      paragraphs: [
        "To the maximum extent permitted by law, Buy Lands India and its directors, officers, employees, and partners shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, goodwill, or property arising out of or related to your use of the Platform or any transaction between users. Our total aggregate liability for any claim shall not exceed the amount, if any, paid by you to us in the twelve (12) months preceding the claim.",
      ],
    },
    {
      number: 13,
      title: "Indemnification",
      paragraphs: [
        "You agree to indemnify and hold harmless Buy Lands India and its affiliates from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the Platform, your content or listings, your violation of these Terms, or your infringement of any rights of a third party.",
      ],
    },
    {
      number: 14,
      title: "Suspension and Termination",
      paragraphs: [
        "We may suspend or terminate your access to the Platform, with or without notice, if you violate these Terms, engage in fraudulent or unlawful activity, or where required by law. You may stop using the Platform at any time. Provisions that by their nature should survive termination (including ownership, disclaimers, limitation of liability, and indemnity) will continue to apply.",
      ],
    },
    {
      number: 15,
      title: "Governing Law and Jurisdiction",
      paragraphs: [
        "These Terms are governed by and construed in accordance with the laws of India. Subject to the dispute resolution provisions below, the courts at [City, State] shall have exclusive jurisdiction over any disputes arising out of or in connection with these Terms.",
      ],
    },
    {
      number: 16,
      title: "Dispute Resolution",
      paragraphs: [
        "Any dispute arising out of or relating to these Terms shall first be attempted to be resolved amicably. Failing resolution, the dispute shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, conducted by a sole arbitrator appointed by us, with the seat of arbitration at [City] and proceedings conducted in [English].",
      ],
    },
    {
      number: 17,
      title: "Changes to These Terms",
      paragraphs: [
        'We may modify these Terms at any time. Updated Terms will be posted on the Platform with a revised "Last updated" date. Material changes may be notified through the Platform or by email. Your continued use after changes take effect constitutes acceptance of the revised Terms.',
      ],
    },
    {
      number: 18,
      title: "Grievance Redressal",
      paragraphs: [
        "In compliance with the Information Technology Act, 2000 and applicable rules, complaints regarding content or use of the Platform may be addressed to:",
      ],
      items: [
        "Grievance Officer: [Name]",
        "Email: grievance@buylandsindia.com",
        "Phone: [Phone number]",
        "Address: [Registered office address]",
      ],
    },
    {
      number: 19,
      title: "Contact Us",
      paragraphs: [
        "For any questions about these Terms, please contact us at support@buylandsindia.com or [Phone number].",
      ],
    },
  ],
  closingParagraph:
    "These Terms of Service are effective as of the date indicated above and supersede all previous versions.",
};
