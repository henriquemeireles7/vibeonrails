/**
 * Email module barrel export
 */

export { sendEmail, type SendEmailOptions } from './client.js';
export {
  loadTemplate,
  parseTemplate,
  renderTemplate,
  type EmailTemplate,
  type RenderedEmail,
} from './templates.js';
