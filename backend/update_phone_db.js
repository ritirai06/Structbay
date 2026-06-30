require('dotenv').config();
const mongoose = require('mongoose');
const CMS = require('./src/models/CMS');

async function updatePhone() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        // Update the phone number in CMS document
        const cms = await CMS.findOne();
        if (cms) {
            let modified = false;
            if (cms.footer && cms.footer.phone !== '+91 70905 70505') {
                cms.footer.phone = '+91 70905 70505';
                modified = true;
            }
            if (cms.contact && cms.contact.phone !== '+91 70905 70505') {
                cms.contact.phone = '+91 70905 70505';
                modified = true;
            }
            
            if (modified) {
                await cms.save();
                console.log('CMS phone updated in DB.');
            } else {
                console.log('CMS phone already up to date in DB.');
            }
        } else {
            console.log('No CMS document found.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updatePhone();
