interface HubSpotContact {
  email: string;
  name: string;
  company?: string;
  website?: string;
}

interface HubSpotEmailData {
  to: string;
  from: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export async function createHubSpotContact(contact: HubSpotContact): Promise<boolean> {
  try {
    // Handle multiple emails by using the first one as primary
    const primaryEmail = contact.email.split(',')[0].trim();
    const allEmails = contact.email.includes(',') ? contact.email : primaryEmail;
    
    console.log('Creating HubSpot contact:', primaryEmail);
    
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      throw new Error("HUBSPOT_API_KEY environment variable is required");
    }

    const [firstName, ...lastNameParts] = contact.name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const currentDate = new Date().toISOString();
    const contactData = {
      properties: {
        email: primaryEmail, // Use primary email for HubSpot
        firstname: firstName,
        lastname: lastName,
        ...(contact.company && { company: contact.company }),
        ...(contact.website && { website: contact.website }),
        lifecyclestage: 'lead',
        hs_lead_status: 'NEW',
        hs_analytics_source: 'DIRECT_TRAFFIC',
        // Store all emails in a custom field if multiple were provided
        ...(allEmails !== primaryEmail && { additional_emails: allEmails })
      }
    };

    console.log('HubSpot contact data:', JSON.stringify(contactData, null, 2));

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot API error details:', errorText);
      
      // Parse error response to get more details
      try {
        const errorData = JSON.parse(errorText);
        console.error('HubSpot API error details:', errorData);
        
        // If contact already exists (409 or specific error message), try to update instead
        if (response.status === 409 || 
            (errorData.message && errorData.message.includes('already exists')) ||
            (errorData.message && errorData.message.includes('Contact already exists'))) {
          console.log('Contact already exists, attempting to update...');
          return await updateHubSpotContact(contact);
        }
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      // For other errors, still return true to avoid blocking the flow
      console.log('HubSpot contact creation failed, but continuing with process');
      return true;
    }

    console.log('HubSpot contact created successfully');
    return true;
  } catch (error) {
    console.error('Error creating HubSpot contact:', error);
    // Don't block the process for HubSpot errors
    return true;
  }
}

export async function updateHubSpotContact(contact: HubSpotContact): Promise<boolean> {
  try {
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      throw new Error("HUBSPOT_API_KEY environment variable is required");
    }

    const [firstName, ...lastNameParts] = contact.name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const currentDate = new Date().toISOString();
    const contactData = {
      properties: {
        firstname: firstName,
        lastname: lastName,
        company: contact.company || '',
        website: contact.website || '',
        lifecyclestage: 'lead',
        lead_source: 'LLM Visibility Audit Tool',
        hs_lead_status: 'NEW',
        lead_rating: 'HOT',
        last_activity_date: currentDate,
        notes_last_contacted: currentDate,
        hs_analytics_source: 'DIRECT_TRAFFIC',
        hs_analytics_source_data_1: 'LLM Audit Tool Update',
        hs_analytics_source_data_2: 'Revenue Experts AI'
      }
    };

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contact.email}?idProperty=email`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating HubSpot contact:', error);
    // Don't block the process for HubSpot errors
    return true;
  }
}

export async function createHubSpotActivity(contactEmail: string, activityContent: string): Promise<boolean> {
  try {
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      throw new Error("HUBSPOT_API_KEY environment variable is required");
    }

    // Get the contact ID first
    const contactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactEmail}?idProperty=email`, {
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!contactResponse.ok) {
      console.error('Failed to get contact for activity creation');
      return false;
    }

    const contact = await contactResponse.json();
    
    // Create a task/activity record
    const taskData = {
      properties: {
        hs_task_body: activityContent,
        hs_task_subject: 'LLM Visibility Audit Report Delivered',
        hs_task_status: 'COMPLETED',
        hs_task_type: 'EMAIL',
        hs_task_priority: 'HIGH',
        hs_timestamp: new Date().toISOString()
      },
      associations: [
        {
          to: {
            id: contact.id
          },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 204 // Contact to Task association
            }
          ]
        }
      ]
    };

    const taskResponse = await fetch('https://api.hubapi.com/crm/v3/objects/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (taskResponse.ok) {
      console.log('HubSpot activity created successfully');
      return true;
    } else {
      console.error('Failed to create HubSpot activity:', await taskResponse.text());
      return false;
    }
  } catch (error) {
    console.error('Error creating HubSpot activity:', error);
    return false;
  }
}

export async function createHubSpotNote(contactEmail: string, noteContent: string): Promise<boolean> {
  try {
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      throw new Error("HUBSPOT_API_KEY environment variable is required");
    }

    // First, get the contact ID
    const contactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactEmail}?idProperty=email`, {
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!contactResponse.ok) {
      return false;
    }

    const contact = await contactResponse.json();
    
    // Create note associated with the contact
    const noteData = {
      properties: {
        hs_note_body: noteContent,
        hs_timestamp: new Date().toISOString()
      },
      associations: [
        {
          to: {
            id: contact.id
          },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 202
            }
          ]
        }
      ]
    };

    const noteResponse = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });

    return noteResponse.ok;
  } catch (error) {
    console.error('Error creating HubSpot note:', error);
    return false;
  }
}

export function generateContactNote(analysisResults: any, url: string): string {
  return `LLM Visibility Audit Report Requested

Website Analyzed: ${url}
Analysis Date: ${analysisResults.analyzedAt ? new Date(analysisResults.analyzedAt).toLocaleDateString() : new Date().toLocaleDateString()}
Request Date: ${new Date().toLocaleDateString()}

Analysis Summary:
- Overall Score: ${analysisResults.overallScore}/100
- SEO Score: ${analysisResults.seoScore}/100
- Technical Score: ${analysisResults.techScore}/100
- Content Score: ${analysisResults.contentScore}/100
- Accessibility Score: ${analysisResults.accessibilityScore}/100

AI Crawler Access Status:
- GPTBot: ${analysisResults.technicalSeo.botAccessibility.gptBot ? 'Accessible' : 'Blocked'}
- ClaudeBot: ${analysisResults.technicalSeo.botAccessibility.claudeBot ? 'Accessible' : 'Blocked'}
- CCBot: ${analysisResults.technicalSeo.botAccessibility.ccBot ? 'Accessible' : 'Blocked'}

Citation Potential Score: ${analysisResults.citationPotential.citationReadiness}/100

Key Issues Found:
${analysisResults.recommendations.high.map((rec: any) => `- ${rec.title}`).join('\n')}

Lead Source: LLM Visibility Audit Tool
Status: Report Ready for Manual Follow-up
`;
}

export async function createFollowUpTask(contactEmail: string, websiteUrl: string, analysisResults: any): Promise<boolean> {
  try {
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      throw new Error("HUBSPOT_API_KEY environment variable is required");
    }

    // Get the contact ID first
    const contactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactEmail}?idProperty=email`, {
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!contactResponse.ok) {
      console.error('Failed to get contact for follow-up task creation');
      return false;
    }

    const contact = await contactResponse.json();
    
    // Calculate due date (3 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateTimestamp = dueDate.getTime();
    
    // Get the owner ID for john@marketingexperts.ai
    const ownerResponse = await fetch('https://api.hubapi.com/crm/v3/owners/', {
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let ownerId = null;
    if (ownerResponse.ok) {
      const owners = await ownerResponse.json();
      const owner = owners.results?.find((o: any) => o.email === 'john@marketingexperts.ai');
      if (owner) {
        ownerId = owner.id;
      }
    }

    // Create the follow-up task
    const taskData = {
      properties: {
        hs_task_body: `Follow up on LLM Visibility Audit Report delivered for ${websiteUrl}. 
        
Contact completed audit request and received comprehensive analysis report.
Overall Score: ${analysisResults.overallScore || 0}/100

Next Steps:
• Review if they've had time to implement recommendations
• Discuss any questions about the audit findings
• Explore additional LLM visibility optimization services
• Schedule consultation if interested in further optimization

Report delivered via: ${contactEmail}`,
        hs_task_subject: `Follow up: LLM Visibility Audit - ${websiteUrl}`,
        hs_task_status: 'NOT_STARTED',
        hs_task_type: 'EMAIL',
        hs_task_priority: 'MEDIUM',
        hs_timestamp: dueDateTimestamp.toString(),
        hs_task_for_object_type: 'CONTACT',
        ...(ownerId && { hubspot_owner_id: ownerId })
      },
      associations: [
        {
          to: {
            id: contact.id
          },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 204 // Contact to Task association
            }
          ]
        }
      ]
    };

    const taskResponse = await fetch('https://api.hubapi.com/crm/v3/objects/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (taskResponse.ok) {
      const taskResult = await taskResponse.json();
      console.log(`Follow-up task created successfully: ${taskResult.id}, Due: ${dueDate.toISOString().split('T')[0]}`);
      return true;
    } else {
      const errorText = await taskResponse.text();
      console.error('Failed to create follow-up task:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error creating follow-up task:', error);
    return false;
  }
}