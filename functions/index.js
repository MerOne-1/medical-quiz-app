const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure nodemailer with your email service
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
});

// Helper function to send email
async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: functions.config().email.user,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}



// Function triggered when a new registration request is created
exports.sendRegistrationEmail = functions.region('europe-west1').firestore
  .document('registrationRequests/{docId}')
  .onCreate(async (snapshot, context) => {
  const data = snapshot.data();
  if (!data || !data.email) {
    console.log('No email in the registration request');
    return;
  }

  try {
    await sendEmail(
      data.email,
      'Demande d\'accès à Pharmind - En attente de validation',
      `
        <p>Bonjour,</p>
        <p>Nous avons bien reçu votre demande d'accès à la plateforme Pharmind.</p>
        <p>Votre demande est actuellement en cours d'examen par notre équipe d'administration. 
        Une fois votre demande approuvée, vous recevrez un email contenant un lien pour configurer votre compte.</p>
        <p>Cordialement,<br>L'équipe Pharmind</p>
      `
    );
    console.log('Registration confirmation email sent to:', data.email);
  } catch (error) {
    console.error('Error sending registration email:', error);
    throw error;
  }
});

// Function triggered when a registration request is updated to 'approved'
exports.sendApprovalEmail = functions.region('europe-west1').firestore
  .document('registrationRequests/{docId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();

    // Only send email if status changed to 'approved'
    if (!after || !before || before.status === 'approved' || after.status !== 'approved') {
      return;
    }

    try {
      // Generate a setup link that expires in 24 hours
      const actionCodeSettings = {
        url: 'https://medical-quiz-app-886ac.web.app/setup-account',
        handleCodeInApp: true
      };

      const setupLink = await admin.auth().generateSignInWithEmailLink(
        after.email,
        actionCodeSettings
      );

      await sendEmail(
        after.email,
        'Accès approuvé - Configurez votre compte Pharmind',
        `
          <p>Bonjour,</p>
          <p>Votre demande d'accès à la plateforme Pharmind a été approuvée !</p>
          <p>Pour finaliser la création de votre compte, veuillez cliquer sur le lien ci-dessous :</p>
          <p><a href="${setupLink}">${setupLink}</a></p>
          <p><strong>Important :</strong></p>
          <ul>
            <li>Ce lien est valable pendant 24 heures</li>
            <li>Pour des raisons de sécurité, vous devrez créer votre mot de passe lors de votre première connexion</li>
          </ul>
          <p>Cordialement,<br>L'équipe Pharmind</p>
        `
      );
      console.log('Approval email sent to:', after.email);
    } catch (error) {
      console.error('Error sending approval email:', error);
      throw error;
    }
  });
