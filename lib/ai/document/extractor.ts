import { DocumentField, DocumentType } from "./types";

const EXPECTED_FIELDS: Partial<Record<DocumentType, string[]>> = {
  passport: [
    "surname",
    "givenNames",
    "passportNumber",
    "nationality",
    "birthDate",
    "expiryDate",
    "issueDate",
    "issuingCountry",
    "sex",
  ],

  national_id: [
    "surname",
    "givenNames",
    "identityNumber",
    "documentNumber",
    "birthDate",
    "expiryDate",
    "nationality",
    "address",
  ],

  residence_permit: [
    "surname",
    "givenNames",
    "documentNumber",
    "birthDate",
    "expiryDate",
    "nationality",
    "permitType",
  ],

  health_insurance: [
    "fullName",
    "insuranceNumber",
    "providerName",
    "validFrom",
    "validUntil",
  ],

  address_proof: [
    "fullName",
    "address",
    "issueDate",
    "issuingAuthority",
  ],

  payslip: [
    "employeeName",
    "employerName",
    "period",
    "grossSalary",
    "netSalary",
    "currency",
  ],

  employment_contract: [
    "employeeName",
    "employerName",
    "startDate",
    "jobTitle",
    "salary",
    "currency",
  ],

  bank_statement: [
    "accountHolder",
    "iban",
    "bankName",
    "statementDate",
    "balance",
    "currency",
  ],

  birth_certificate: [
    "fullName",
    "birthDate",
    "placeOfBirth",
    "givenNames",
    "surname",
  ],

  marriage_certificate: [
    "fullName",
    "surname",
    "givenNames",
    "issueDate",
    "issuingAuthority",
  ],
};

export function getExpectedFieldKeys(
  documentType: DocumentType,
): string[] {
  return EXPECTED_FIELDS[documentType] ?? [];
}

export function keepRelevantFields(
  documentType: DocumentType,
  fields: DocumentField[],
): DocumentField[] {
  const expected = new Set(getExpectedFieldKeys(documentType));

  if (expected.size === 0) {
    return fields;
  }

  const relevantFields = fields.filter((field) =>
    expected.has(field.key),
  );

  const extraFields = fields.filter(
    (field) => !expected.has(field.key),
  );

  // Beklenen alanları öne al, AI'ın bulduğu ek alanları da koru.
  return [...relevantFields, ...extraFields];
}