import { cptacData }  from "../data/cptac_data/cptac_data.js";

import * as ss from 'simple-statistics';

export const resolvers = {
    Query: {
      appname: () => "graphql-poc 1.0.0",

      getAllDonors: () => {
        return cptacData.Donor;
      },

      getAllExposures: () => {
        return cptacData.Exposure;
      },

      getAllFamily: () => {
        return cptacData.Family;
      },

      getAllClinicalHistory: () => {
        return cptacData.ClinicalHistory;
      },

      getAllDiagnosis: () => {
        return cptacData.Diagnosis;
      },

      getAllPublication: () => {
        return cptacData.Publications;
      },

      getAllDatasets: () => {
        return cptacData.Dataset;
      },
      
      donorsCountByCancerSite: (_, { cancerSite }) => {
        const diagnoses = cptacData.Diagnosis.filter((diagnosis) => diagnosis.disease.cancerSite === cancerSite);
        
        if (diagnoses.length === 0) {
          return null; // or handle the case where no diagnoses are found for the specified cancer site
        }
  
        const donorIds = diagnoses.map((diagnosis) => diagnosis.donor_id);
        const donors = cptacData.Donor.filter((donor) => donorIds.includes(donor.donor_id));

        const totalDonors = donors.length;
        const maleDonors = donors.filter((donor) => donor.gender === "Male").length;
        const femaleDonors = donors.filter((donor) => donor.gender === "Female").length;
  
        // Calculate average age
        const averageAge = calculateAverageAgeDonor(donors);
  
        return {
          cancerSite,
          totalDonors,
          maleDonors,
          femaleDonors,
          averageAge,
        };
      },
      
      donorsWithDiabetesCount: () => {
        // Ensure cptacData object and Donor array are not null or undefined
        if (!cptacData || !cptacData.Donor || !Array.isArray(cptacData.Donor)) {
          throw new Error('Unable to fetch donor data');
        }
  
        const donors = cptacData.Donor;
  
        // Calculate counts based on conditions
        const totalDonors = donors.length;
        const obeseDonorsCount = donors.filter(donor => donor.obesityClassIII === true).length;
        const overweightDonorsCount = donors.filter(donor => donor.overweight === true).length;
        const diabetesDonorsCount = donors.filter(donor => donor.diabetes === true).length;
        const prediabetesDonorsCount = donors.filter(donor => donor.prediabetes === true).length;
  
        // Return the counts
        return {
          totalDonors,
          obeseDonorsCount,
          overweightDonorsCount,
          diabetesDonorsCount,
          prediabetesDonorsCount,
        };
      },

      familyHistoryAnalysis: (_, { cancerSite }) => {
        const filteredFamilies = cptacData.Family.filter(
          (family) => family.cancerSiteName === cancerSite
        );
  
        const totalFamilies = filteredFamilies.length;
        const affectedFamilies = filteredFamilies.filter((family) => family.ageOfDiagnosis !== null).length;
  
        let averageAgeOfDiagnosis = 0;
        const ages = filteredFamilies.map((family) => family.ageOfDiagnosis);
        if (ages.length > 0) {
          averageAgeOfDiagnosis = ages.reduce((sum, age) => (sum += age || 0), 0) / ages.length;
        }
  
        let mostCommonRelation = null;
        if (filteredFamilies.length > 0) {
          const relationCounts = filteredFamilies.reduce((countMap, family) => {
            const relation = family.patientRelation;
            countMap[relation] = (countMap[relation] || 0) + 1;
            return countMap;
          }, {});
  
          mostCommonRelation = Object.keys(relationCounts).reduce((a, b) =>
            relationCounts[a] > relationCounts[b] ? a : b
          );
        }
  
        return {
          cancerSite,
          totalFamilies,
          affectedFamilies,
          averageAgeOfDiagnosis,
          mostCommonRelation,
        };
      },

      chemotherapyAdverseEventsAnalysis: (_, { selectedRegimen }) => {
        const filteredChemotherapyData = cptacData.Diagnosis.filter(
          (diagnosis) =>
            diagnosis.diagnostictests.eventtype.treatmenteventtype &&
            diagnosis.diagnostictests.eventtype.treatmenteventtype.chemotherapy &&
            diagnosis.diagnostictests.eventtype.treatmenteventtype.chemotherapy.chemotherapydetails
              .selectedRegimen === selectedRegimen
        );

        let totalCycles = 0;
        filteredChemotherapyData.forEach((diagnosis) => {
          const numberOfCycles =
            diagnosis.diagnostictests.eventtype.treatmenteventtype?.chemotherapy?.chemotherapydetails
              .numberOfCycles || 0;
          totalCycles += numberOfCycles;
        });

        const averageNumberOfCycles =
          totalCycles / (filteredChemotherapyData.length || 1); // Avoid division by zero

        const adverseEventsList = [];
        filteredChemotherapyData.forEach((diagnosis) => {
          const events =
            diagnosis.diagnostictests.eventtype.treatmenteventtype?.chemotherapy?.chemotherapydetails
              .adverseEventList || [];
          adverseEventsList.push(...events);
        });

        const eventCounts =
          adverseEventsList.length > 0
            ? adverseEventsList.reduce((counts, event) => ({
                ...counts,
                [event]: (counts[event] || 0) + 1,
              }), {})
            : {};

        const mostCommonAdverseEvent =
          Object.keys(eventCounts).length > 0
            ? Object.keys(eventCounts).reduce((a, b) => (eventCounts[a] > eventCounts[b] ? a : b))
            : null;

        const mostCommonMedication =
          filteredChemotherapyData[0]?.diagnostictests.eventtype.treatmenteventtype?.chemotherapy?.chemotherapydetails
            .adverseEventMedication || null;

        return {
          selectedRegimen,
          totalCycles,
          averageNumberOfCycles,
          mostCommonAdverseEvent,
          mostCommonMedication,
        };
      },

      diagnosisByEthnicity: (_, { ethnicity }) => {
        const diagnoses = cptacData.Diagnosis.filter(
          (diagnosis) => cptacData.Donor.find((donor) => donor.donor_id === diagnosis.donor_id)?.ethnicity === ethnicity
        );
  
        if (diagnoses.length === 0) {
          return null; // or handle the case where no diagnoses are found for the specified ethnicity
        }
  
        const donorIds = diagnoses.map((diagnosis) => diagnosis.donor_id);
        const donors = cptacData.Donor.filter((donor) => donorIds.includes(donor.donor_id));
  
        const totalDiagnoses = diagnoses.length;
        const maleDiagnoses = diagnoses.filter((diagnosis) => cptacData.Donor.find((donor) => donor.donor_id === diagnosis.donor_id)?.gender === "Male").length;
        const femaleDiagnoses = diagnoses.filter((diagnosis) => cptacData.Donor.find((donor) => donor.donor_id === diagnosis.donor_id)?.gender === "Female").length;
  
        // Calculate average age at diagnosis
        const averageAgeAtDiagnosis = calculateAverageAgeDonor(donors);
  
        return {
          ethnicity,
          totalDiagnoses,
          maleDiagnoses,
          femaleDiagnoses,
          averageAgeAtDiagnosis,
        };
      },


      surgeryAdverseEventsAnalysis: (_, { surgeryName }) => {
        try {
          // Assuming your surgery data is stored in the cptacData.Surgery array
          const filteredSurgeries = cptacData.Diagnosis.filter(
            (diagnoses) =>
              diagnoses.diagnostictests &&
              diagnoses.diagnostictests.eventtype &&
              diagnoses.diagnostictests.eventtype.treatmenteventtype &&
              diagnoses.diagnostictests.eventtype.treatmenteventtype.surgery &&
              diagnoses.diagnostictests.eventtype.treatmenteventtype.surgery.surgerydetails && 
              diagnoses.diagnostictests.eventtype.treatmenteventtype.surgery.surgerydetails.name === surgeryName
          );
  
          const totalSurgeries = filteredSurgeries.length;

          const adverseEventsList = [];
          filteredSurgeries.forEach((diagnoses) => {
            const events = diagnoses.diagnostictests.eventtype.treatmenteventtype.surgery.surgerydetails.adverseEventList || [];
            adverseEventsList.push(...events);
          });
  
          const adverseEventsCount =
            adverseEventsList.length > 0
              ? adverseEventsList.reduce((counts, event) => ({
                  ...counts,
                  [event]: (counts[event] || 0) + 1,
                }), {})
              : {};

          console.log(adverseEventsCount)

          // Find the most common adverse event
          const mostCommonAdverseEvent =
            Object.keys(adverseEventsCount).length > 0
              ? Object.keys(adverseEventsCount).reduce(
                  (a, b) =>
                    adverseEventsCount[a] > adverseEventsCount[b] ? a : b
                )
              : null;

          const mostCommonMedication =
          mostCommonAdverseEvent &&
          filteredSurgeries
            .flatMap((diagnoses) =>
              diagnoses.diagnostictests.eventtype.treatmenteventtype.surgery.surgerydetails.adverseEventList.includes(
                mostCommonAdverseEvent
              )
                ? diagnoses.diagnostictests.eventtype.treatmenteventtype.surgery.surgerydetails.adverseEventMedication
                : []
            )
            .reduce((a, b) => (adverseEventsList[a] > adverseEventsList[b] ? a : b), null);
  
          return {
            surgeryName,
            totalSurgeries,
            mostCommonAdverseEvent,
            mostCommonMedication,
          };
        } catch (error) {
          console.error("Error in surgeryAdverseEventsAnalysis resolver:", error);
          throw new Error("Internal server error");
        }
      },

      // Basic Queries

      getDonorById: (_, { donor_id }) => {
        // Find the donor with the specified donor_id
        const donor = cptacData.Donor.find(
          (donor) => donor.donor_id === donor_id
        );
  
        // Check if the donor is found
        if (!donor) {
          return null;
        }
  
        // Return the donor details
        return {
          donor_id: donor.donor_id,
          patientId: donor.patientId || null,
          patientUuid: donor.patientUuid || null,
          bmi: donor.bmi || null,
          preMenopauseCycleType: donor.preMenopauseCycleType || null,
          preMenopauseCycleDuration: donor.preMenopauseCycleDuration || null,
          age: donor.age || null,
          gender: donor.gender || null,
          menstruation: donor.menstruation || null,
          occupation: donor.occupation || null,
          ethnicity: donor.ethnicity || null,
          height: donor.height || null,
          weight: donor.weight || null,
          diet: donor.diet || null,
          maritalStatus: donor.maritalStatus || null,
          numberOfChildren: donor.numberOfChildren || null,
          waistCircumference: donor.waistCircumference || null,
          baselineHba1c: donor.baselineHba1c || null,
          baselineFpg: donor.baselineFpg || null,
          race: donor.race || null,
          ethnicityHispanic: donor.ethnicityHispanic || null,
          asianMajority: donor.asianMajority || null,
          diseaseDuration: donor.diseaseDuration || null,
          indication: donor.indication || null,
          diseaseEntryCriteria: donor.diseaseEntryCriteria || null,
          overweight: donor.overweight || null,
          obesityClassI: donor.obesityClassI || null,
          obesityClassII: donor.obesityClassII || null,
          obesityClassIII: donor.obesityClassIII || null,
          diabetes: donor.diabetes || null,
          prediabetes: donor.prediabetes || null,
          dyslipidemia: donor.dyslipidemia || null,
          hypertension: donor.hypertension || null,
          depression: donor.depression || null,
          pcos: donor.pcos || null,
        };
      },

      getDonorsWithCondition: (_, { indication }) => {
        return cptacData.Donor.filter(donor => donor.indication === indication);
      },

      getDonorsWithExposure: (_, { exposureType }) => {
        // Filter exposures to get donor IDs
        const exposureDonorIds = cptacData.Exposure
          .filter(exposure => exposure[exposureType] === true)
          .map(exposure => exposure.donor_id);
  
        // Fetch all donors with the obtained donor IDs
        const donorsWithExposure = cptacData.Donor
          .filter(donor => exposureDonorIds.includes(donor.donor_id))
          .map(donor => ({
            ...donor,
            exposureType, // Include exposureType in the result
          }));
  
        return donorsWithExposure;
      },

      // Analytical Queries

      donorDemographics: () => {
        const totalDonors = cptacData.Donor.length;
        const totalMaleDonors = cptacData.Donor.filter(donor => donor.gender === 'Male').length;
        const totalFemaleDonors = totalDonors - totalMaleDonors;
  
        const totalAge = cptacData.Donor.reduce((acc, donor) => acc + donor.age, 0);
        const averageAge = totalAge / totalDonors;
  
        const totalBMI = cptacData.Donor.reduce((acc, donor) => acc + donor.bmi, 0);
        const averageBMI = totalBMI / totalDonors;
  
        return {
          totalDonors,
          averageAge,
          maleDonors: totalMaleDonors,
          femaleDonors: totalFemaleDonors,
          averageBMI,
        };
      },

      diseaseDistributionByGender: () => {
        const diseaseDistribution = [];
  
        // Calculate disease distribution by gender
        const genders = [...new Set(cptacData.Donor.map((donor) => donor.gender))];
        genders.forEach((gender) => {
          const casesByGender = cptacData.Diagnosis.filter((d) => cptacData.Donor.find((donor) => donor.donor_id === d.donor_id && donor.gender === gender));
  
          const totalCases = casesByGender.length;
          const commonCancerSites = [...new Set(casesByGender.map((d) => d.disease.cancerSite))];
          const averageAgeAtDiagnosis = casesByGender.reduce((sum, d) => sum + cptacData.ClinicalHistory.find((c) => c.donor_id === d.donor_id).ageAtDiagnosis, 0) / totalCases;
  
          diseaseDistribution.push({
            gender,
            totalCases,
            commonCancerSites,
            averageAgeAtDiagnosis,
          });
        });
  
        return diseaseDistribution;
      },

      exposureAndLifestyle: () => {
        // Calculate percentages and averages from mock data
        const totalDonors = cptacData.Donor.length;
  
        const smokingPercentage =
          (cptacData.Exposure.filter((exposure) => exposure.smoking).length / totalDonors) * 100;
  
        const drinkingPercentage =
          (cptacData.Exposure.filter((exposure) => exposure.drinking).length / totalDonors) * 100;
  
        const obesityPercentage =
          (cptacData.Donor.filter((donor) => donor.obesityClassI || donor.obesityClassII || donor.obesityClassIII).length /
            totalDonors) * 100;
  
        const totalPhysicalActivity = cptacData.Exposure.reduce((acc, exposure) => {
          if (exposure.exercise === 'Moderate') {
            return acc + 2; // Assigning a score for moderate exercise
          } else if (exposure.exercise === 'High Intensity') {
            return acc + 3; // Assigning a higher score for high-intensity exercise
          }
          return acc;
        }, 0);
  
        const averagePhysicalActivity = totalPhysicalActivity / totalDonors;
  
        return {
          smokingPercentage,
          drinkingPercentage,
          obesityPercentage,
          averagePhysicalActivity: averagePhysicalActivity.toFixed(2),
        };
      },

      familyHistoryAndHereditaryFactors: () => {
        const totalFamilies = cptacData.Family.length;
        
        const hereditaryFactors = cptacData.Family
          .filter(entry => entry.herediatries !== null && entry.herediatries !== 'None')
          .map(entry => entry.herediatries);
        
        const averageAgeOfDiagnosis = cptacData.Family
          .filter(entry => entry.ageOfDiagnosis !== null)
          .reduce((sum, entry) => sum + entry.ageOfDiagnosis, 0) / totalFamilies;
  
        const cancerSites = cptacData.Family
          .filter(entry => entry.cancerSiteName !== null)
          .map(entry => entry.cancerSiteName);
  
        const mostCommonCancerSite = findMostCommonElement(cancerSites);
  
        return {
          totalFamilies,
          hereditaryFactors,
          averageAgeOfDiagnosis,
          mostCommonCancerSite,
        };
      },

      chemotherapyAdverseEventsSummary: () => {
        // Extract chemotherapy adverse events data from cptacData
        const chemotherapyData = cptacData.Diagnosis.map((d) => d.diagnostictests.eventtype.treatmenteventtype.chemotherapy);
  
        // Calculate total cycles
        const totalCycles = chemotherapyData.reduce((sum, chemotherapy) => sum + chemotherapy.chemotherapydetails.numberOfCycles, 0);
  
        // Calculate average number of cycles
        const averageNumberOfCycles = totalCycles / chemotherapyData.length;
  
        // Get all adverse events and medications
        const adverseEvents = chemotherapyData.map((chemotherapy) => chemotherapy.chemotherapydetails.adverseEventList).flat();
        const medications = chemotherapyData.map((chemotherapy) => chemotherapy.chemotherapydetails.adverseEventMedication).filter(Boolean);
  
        // Calculate the most common adverse event and medication
        const mostCommonAdverseEvent = getMostCommonItem(adverseEvents);
        const mostCommonMedication = getMostCommonItem(medications);
  
        return {
          totalCycles,
          averageNumberOfCycles,
          mostCommonAdverseEvent,
          mostCommonMedication,
        };
      },

    // Advanced GraphQL queries

      oncologySummary: (_, { cancerSite }) => {
        const diagnosedCases = cptacData.Diagnosis.filter((diagnosis) => diagnosis.disease.cancerSite === cancerSite);  
        const totalDiagnosedCases = diagnosedCases.length;
  
        if (totalDiagnosedCases === 0) {
          return null; // or return a default value or handle the case where there are no diagnosed cases
        }
  
        // Calculate mostCommonMorphology
        const morphologyCount = {};
        diagnosedCases.forEach((diagnosis) => {
          const morphology = diagnosis.disease.morphology;
          morphologyCount[morphology] = (morphologyCount[morphology] || 0) + 1;
        });
        const mostCommonMorphology = Object.keys(morphologyCount).reduce(
          (a, b) => (morphologyCount[a] > morphologyCount[b] ? a : b)
        );

        // Calculate averageAgeAtDiagnosis
        const totalAge = diagnosedCases.reduce((sum, diagnosedCases) => {
          const donor = cptacData.Donor.find((donor) => donor.donor_id === diagnosedCases.donor_id);
          return sum + (donor ? donor.age : 0);
        }, 0);
        
        const averageAgeAtDiagnosis = totalAge / totalDiagnosedCases;

        // Calculate commonTreatmentRegimens
        const treatmentRegimenCount = {};
        diagnosedCases.forEach((diagnosis) => {
          const regimen = diagnosis.diagnostictests.eventtype.treatmenteventtype.chemotherapy.chemotherapydetails.selectedRegimen;
          treatmentRegimenCount[regimen] = (treatmentRegimenCount[regimen] || 0) + 1;
        });
        const commonTreatmentRegimens = Object.keys(treatmentRegimenCount).map((regimen) => ({
          regimen,
          totalDonors: treatmentRegimenCount[regimen],
        }));

  
        return {
          cancerSite,
          totalDiagnosedCases,
          mostCommonMorphology,
          averageAgeAtDiagnosis,
          commonTreatmentRegimens,
        };
      },

      ageDistributionOfDiagnosedDonors: () => {
        // Calculate the age distribution of diagnosed donors
        const ageDistribution = cptacData.Donor.reduce((accumulator, donor) => {
          const ageGroup = getAgeGroup(donor.age);
          accumulator[ageGroup] = (accumulator[ageGroup] || 0) + 1;
          return accumulator;
        }, {});
  
        // Convert the age distribution object into an array of objects
        const result = Object.entries(ageDistribution).map(([ageGroup, totalDiagnosedDonors]) => ({
          ageGroup,
          totalDiagnosedDonors,
        }));
  
        return result;
      },

      ethnicityAndDiseasePrevalence: (_, { ethnicity }) => {
        // Use cptacData to calculate the required values
        const donors = cptacData.Donor.filter(donor => donor.ethnicity === ethnicity);
        const totalDonors = donors.length;
        
        // Example calculation for disease prevalence and average age
        const diseasePrevalence = donors.reduce((prev, curr) => prev + (curr.disease ? 1 : 0), 0) / totalDonors;
        const averageAge = donors.reduce((prev, curr) => prev + curr.age, 0) / totalDonors;
  
        return {
          ethnicity,
          totalDonors,
          diseasePrevalence,
          averageAge,
        };
      },

      cancerSiteAndFamilyHistoryAnalysis: (parent, { cancerSite }) => {
        // Assuming cptacData is available in the same scope
        const families = cptacData.Family.filter(
          (family) => family.cancerSiteName === cancerSite
        );
  
        const totalFamilies = families.length;
        const affectedFamilies = families.filter((family) => family.herediatries !== 'None').length;
  
        // Calculate average age of diagnosis for affected families
        const affectedFamilyAges = families
          .filter((family) => family.herediatries !== 'None' && family.ageOfDiagnosis !== null)
          .map((family) => family.ageOfDiagnosis);
  
        const averageAgeOfDiagnosis =
          affectedFamilyAges.length > 0
            ? affectedFamilyAges.reduce((sum, age) => sum + age, 0) / affectedFamilyAges.length
            : null;
  
        // Find the most common relation in affected families
        const relationCounts = {};
        families.forEach((family) => {
          if (family.herediatries !== 'None' && family.patientRelation !== null) {
            relationCounts[family.patientRelation] =
              (relationCounts[family.patientRelation] || 0) + 1;
          }
        });
  
        const mostCommonRelation = Object.keys(relationCounts).reduce((a, b) =>
          relationCounts[a] > relationCounts[b] ? a : b
        );
  
        return {
          cancerSite,
          totalFamilies,
          affectedFamilies,
          averageAgeOfDiagnosis,
          mostCommonRelation,
        };
      },

      genderBasedExposureAnalysis: (parent, args) => {
        try {
          const { gender } = args;
  
          // Filter donors based on gender
          const genderDonors = cptacData.Donor.filter((donor) => donor.gender === gender);
  
          // Calculate analysis metrics
          let totalDonors = 0;
          let totalSmokers = 0;
          let totalDrinkers = 0;
          let totalBMI = 0;
  
          genderDonors.forEach((donor) => {
            const donorExposure = cptacData.Exposure.find((exposure) => exposure.donor_id === donor.donor_id);
  
            if (donorExposure && donorExposure.smoking === true) {
              totalSmokers++;
            }
  
            if (donorExposure && donorExposure.drinking === true) {
              totalDrinkers++;
            }
  
            totalBMI += donor.bmi;
            totalDonors++;
          });
  
          const smokingPercentage = totalDonors > 0 ? (totalSmokers / totalDonors) * 100 : 0;
          const drinkingPercentage = totalDonors > 0 ? (totalDrinkers / totalDonors) * 100 : 0;
          const averageBMI = totalDonors > 0 ? totalBMI / totalDonors : 0;
  
          // Return the analysis result
          return {
            gender,
            totalDonors,
            smokingPercentage,
            drinkingPercentage,
            averageBMI,
          };
        } catch (error) {
          console.error("Error in genderBasedExposureAnalysis resolver:", error);
          throw new Error("Internal server error");
        }
      },

      performanceStatusAndSurvivalAnalysis: (_, { disease }) => {
        // Assuming you have access to the cptacData object
  
        // Filter donors with the specified disease
        const relevantDonors = cptacData.Donor.filter(
          (donor) => donor.indication === disease
        );
  
        if (relevantDonors.length === 0) {
          // Return null or handle appropriately when no relevant donors are found
          return null;
        }
  
        // Extract donor ids
        const donorIds = relevantDonors.map((donor) => donor.donor_id);
  
        // Filter diagnoses for relevant donors
        const relevantDiagnoses = cptacData.Diagnosis.filter((diagnosis) =>
          donorIds.includes(diagnosis.donor_id)
        );
  
        // Calculate average disease-free survival and progression-free survival
        const totalDiseaseFreeSurvival = relevantDiagnoses.reduce(
          (total, diagnosis) =>
            total +
            parseInt(
              diagnosis.diagnostictests?.eventtype?.treatmenteventtype
                ?.performancestatus?.performancestatusdetails
                ?.diseaseFreeSurvival || 0
            ),
          0
        );
  
        const totalProgressionFreeSurvival = relevantDiagnoses.reduce(
          (total, diagnosis) =>
            total +
            parseInt(
              diagnosis.diagnostictests?.eventtype?.treatmenteventtype
                ?.performancestatus?.performancestatusdetails
                ?.progressionFreeSurvival || 0
            ),
          0
        );
  
        const averageDiseaseFreeSurvival =
          totalDiseaseFreeSurvival / relevantDiagnoses.length || 0;
  
        const averageProgressionFreeSurvival =
          totalProgressionFreeSurvival / relevantDiagnoses.length || 0;
  
        // Get common RECIST criteria
        const recistCriteriaList = relevantDiagnoses.map(
          (diagnosis) =>
            diagnosis.diagnostictests?.eventtype?.treatmenteventtype
              ?.performancestatus?.performancestatusdetails?.recistCriteria || null
        );
  
        const commonRecistCriteria =
          recistCriteriaList.reduce(
            (commonCriteria, criteria) =>
              commonCriteria === null || commonCriteria === criteria
                ? criteria
                : "Mixed", // Handle the case when different criteria are present
            null
          ) || "Not Available";
  
        return {
          disease,
          averageDiseaseFreeSurvival,
          averageProgressionFreeSurvival,
          commonRecistCriteria,
        };
      },

      expressionByGeneId: (_, { geneSymbol }) => {
        // Assuming your data is structured as shown in cptacData
        const geneData = cptacData.geneExpression.assayType.transcriptomics.normalisedData.find(
          (gene) => gene.geneSymbol === geneSymbol
        );
  
        if (!geneData) {
          throw new Error(`Gene with symbol ${geneSymbol} not found`);
        }
  
        return {
          assayType: {
            rawCountData: geneData.expressionData,
            normalisedData: getNormalisedDataForGene(geneSymbol),
          },
        };
      },

      expressionByRegimen: (_, { regimen }, { cptacData }) => {
        // Assuming cptacData is accessible in the resolver context
  
        // Filter donors based on the given regimen
        const donorsWithRegimen = cptacData.Diagnosis.filter((diagnosis) => {
          const treatmentEvent = diagnosis.disease.diagnostictests.eventtype.treatmenteventtype.chemotherapy;
          return treatmentEvent && treatmentEvent.chemotherapydetails.selectedRegimen === regimen;
        });
  
        // Extract sample IDs from filtered donors
        const sampleIds = donorsWithRegimen.map((donor) => {
          return cptacData.Exposure.find((exposure) => exposure.donor_id === donor.donor_id)?.sample_id;
        });
  
        // Fetch gene expression data for the selected sample IDs
        const geneExpressionData = cptacData.geneExpression.assayType.rawCountData.map((geneData) => {
          const expressionData = geneData.expressionData.filter((data) => sampleIds.includes(data.sample_id));
          return {
            geneSymbol: geneData.geneSymbol,
            expressionData,
          };
        });
  
        // You can do the same for normalisedData if needed
  
        return {
          assayType: {
            rawCountData: geneExpressionData,
          },
        };
      },

      getPatientDistribution: () => {
        const { Donor, ClinicalHistory } = cptacData;
    
        // Define age group ranges dynamically
        const ageGroupRanges = Array.from(
            { length: Math.ceil(Math.max(...ClinicalHistory.map((p) => p.ageAtDiagnosis)) / 10) },
            (_, i) => ({
                start: i * 10,
                end: (i + 1) * 10 - 1,
            })
        );
    
        // Create a map to store the distribution grouped by tumor stage
        const distributionMap = new Map();
    
        // Populate the distribution map
        Donor.forEach((donor) => {
            const { patientId, gender } = donor;
    
            // Extract tnmStage from the Diagnosis section
            const diagnosisData = cptacData.Diagnosis.find((diagnosis) => diagnosis.patientId === patientId);
            const { disease } = diagnosisData;
            const { tumorStage } = disease;
    
            // Extract age from the ClinicalHistory section
            const clinicalHistoryData = ClinicalHistory.find((history) => history.patientId === patientId);
            const age = clinicalHistoryData ? clinicalHistoryData.ageAtDiagnosis : null;
    
            // Determine the age group for the patient
            const ageGroup = ageGroupRanges.find(
                (range) => age >= range.start && age <= range.end
            );
    
            // Create a unique key for the distribution map
            const key = tumorStage;
    
            // Initialize the count if the key is not present
            if (!distributionMap.has(key)) {
                distributionMap.set(key, {
                    tumorStage,
                    distributions: [],
                });
            }
    
            // Get or initialize the distribution for the specific gender
            const genderDistribution = distributionMap.get(key).distributions.find(
                (d) => d.gender === gender
            );
            if (!genderDistribution) {
                distributionMap.get(key).distributions.push({
                    gender,
                    ageGroups: ageGroupRanges.map((range) => ({
                        range: `${range.start}-${range.end}`,
                        count: 0,
                    })),
                });
            }
    
            // Increment the count for the corresponding age group
            const ageGroupIndex = ageGroupRanges.indexOf(ageGroup);
            if (ageGroupIndex !== -1) {
                distributionMap.get(key).distributions
                    .find((d) => d.gender === gender)
                    .ageGroups[ageGroupIndex].count++;
            }
        });
    
        // Convert the distribution map values to an array
        const distributionArray = Array.from(distributionMap.values());
    
        return distributionArray;
    },
    
      topNGenesByTumorStage: (_, { n }) => {
        const { Assay, Diagnosis, Sample } = cptacData;
        const { normalisedData } = Assay.assayType.transcriptomics;
  
        // Group genes by symbol and tumor stage
        const groupedGenes = normalisedData.reduce((acc, gene) => {
          const { geneSymbol, expressionData } = gene;
  
          expressionData.forEach((sample) => {
            const { sampleId } = sample;
            const sampleData = Sample.find((sample) => sample.sampleId === sampleId);
            const diagnosis = Diagnosis.find((patient) => patient.patientId == sampleData.patientId);
  
            if (sampleData && diagnosis) {
              const { disease } = diagnosis;
              const { tumorStage } = disease;
  
              const key = `${geneSymbol}_${tumorStage}`;
  
              if (!acc[key]) {
                acc[key] = {
                  geneSymbol,
                  tumorStage,
                  samples: [],
                };
              }
  
              acc[key].samples.push({
                sampleId,
                expressionValue: sample.expression_value,
              });
            }
          });
  
          return acc;
        }, {});
  
        // Calculate average expression for each tumor stage for each gene
        const averagedSamples = Object.values(groupedGenes).map(({ geneSymbol, tumorStage, samples }) => {
          const totalExpression = samples.reduce((sum, sample) => sum + sample.expressionValue, 0);
          const avgExpression = totalExpression / samples.length;
  
          return {
            tumorStage,
            geneSymbol,
            samples,
            averageExpression: avgExpression,
          };
        });
  
        // Sort the result by tumor stage and average expression
        const sortedResult = averagedSamples.sort((a, b) => {
          if (a.tumorStage === b.tumorStage) {
            return b.averageExpression - a.averageExpression;
          }
          return a.tumorStage.localeCompare(b.tumorStage);
        });
  
        // Group the result by tumor stage
        const groupedResult = sortedResult.reduce((acc, { tumorStage, geneSymbol, samples, averageExpression }) => {
          if (!acc[tumorStage]) {
            acc[tumorStage] = [];
          }
  
          acc[tumorStage].push({
            geneSymbol,
            samples,
            averageExpression,
          });
  
          return acc;
        }, {});
  
        // Format the final response
        const finalResponse = Object.keys(groupedResult).map((tumorStage) => ({
          tumorStage,
          topGenes: groupedResult[tumorStage].slice(0, n),
        }));
  
        return finalResponse;
      },

      getSampleIdsByTumorStage: () => {
        const sampleIdsByTumorStage = [];
  
        // Iterate over the Diagnosis section in cptacData
        cptacData.Diagnosis.forEach((diagnosis) => {
          const tumorStage = diagnosis.disease.tumorStage;
          const patientId = diagnosis.patientId;
  
          if (tumorStage !== "none" && tumorStage !== undefined) {
            // Find the corresponding Sample data based on patientId
            const sampleData = cptacData.Sample.find((sample) => sample.patientId === patientId);
  
            // If sampleData is found, add the sampleId to the result object
            if (sampleData) {
              const sampleId = sampleData.sampleId;
  
              // Ensure tumorStage is always a non-null string
              const nonNullTumorStage = tumorStage.toString();
  
              // Check if the tumor stage is already present in the result array
              const existingEntry = sampleIdsByTumorStage.find(entry => entry.tumorStage === nonNullTumorStage);
  
              if (existingEntry) {
                // If yes, add the sampleId to the existing entry
                existingEntry.sampleIds.push(sampleId);
              } else {
                // If no, create a new object with tumorStage and sampleIds
                sampleIdsByTumorStage.push({
                  tumorStage: nonNullTumorStage,
                  sampleIds: [sampleId],
                });
              }
            }
          }
        });
        return { tumorStage: sampleIdsByTumorStage };
      },

      getGeneExpressionByTumorStage: () => {
        const geneExpressionByTumorStage = [];
  
        // Iterate over the Diagnosis section in cptacData
        cptacData.Diagnosis.forEach((diagnosis) => {
          const tumorStage = diagnosis.disease.tumorStage;
          const patientId = diagnosis.patientId;
  
          if (tumorStage !== "none" && tumorStage !== undefined) {
            // Find the corresponding Sample data based on patientId
            const sampleData = cptacData.Sample.find((sample) => sample.patientId === patientId);
  
            // If sampleData is found, add the gene expression values to the result object
            if (sampleData) {
              const sampleId = sampleData.sampleId;
  
              // Ensure tumorStage is always a non-null string
              const nonNullTumorStage = tumorStage.toString();
  
              // Check if the tumor stage is already present in the result array
              const existingEntry = geneExpressionByTumorStage.find(entry => entry.tumorStage === nonNullTumorStage);
  
              if (existingEntry) {
                // If yes, add the gene expression values to the existing entry
                existingEntry.geneExpression.push({
                  sampleId,
                  normalisedData: fetchNormalisedDataForSample(sampleId),
                });
              } else {
                // If no, create a new object with tumorStage and gene expression values
                geneExpressionByTumorStage.push({
                  tumorStage: nonNullTumorStage,
                  geneExpression: [{
                    sampleId,
                    normalisedData: fetchNormalisedDataForSample(sampleId),
                  }],
                });
              }
            }
          }
        });

        return { tumorStage: geneExpressionByTumorStage };
      },


      getExpressionCorrelationForGene: (_, { assayTypes, geneSymbol }) => {
        // Fetch expression data for the given gene and assayTypes
        const expressionData = assayTypes.map((assayType) => {
          const data = cptacData.Assay.assayType[assayType].normalisedData.find(entry => entry.geneSymbol === geneSymbol);
          return {
            AssayType: assayType,
            expressionData: data ? data.expressionData : [],
          };
        });
  
        // Find common samples among both assays
        const commonSamples = expressionData.reduce((common, entry) => {
          const sampleIds = entry.expressionData.map(data => data.sampleId);
          return common ? sampleIds.filter(sampleId => common.includes(sampleId)) : sampleIds;
        }, null);
  
        // Filter expression data for common samples
        const filteredExpressionData = expressionData.map(entry => ({
          AssayType: entry.AssayType,
          expressionData: entry.expressionData.filter(data => commonSamples.includes(data.sampleId)),
        }));
  
        // Extract expression values for correlation calculation
        const expressionValues = filteredExpressionData.map(entry => entry.expressionData.map(data => data.expression_value));
  
        // Check if both samples have at least two data points
        if (expressionValues.some(samples => samples.length < 2)) {
          throw new Error('At least two data points are required in each sample for correlation calculation.');
        }
  
        // Calculate correlation value using the simple-statistics library
        const correlationValue = ss.sampleCorrelation(expressionValues[0], expressionValues[1]);
  
        // Prepare the GraphQL response
        const result = {
          geneSymbol,
          correlationValue,
          AssayData: filteredExpressionData.map(entry => ({
            AssayType: entry.AssayType,
            expressionData: entry.expressionData.map(data => ({
              sampleId: data.sampleId,
              expressionValue: data.expression_value,
            })),
          })),
        };
  
        return result;
      },    
  },
};

function fetchNormalisedDataForSample(sampleId) {
  const normalisedData = cptacData.Assay?.assayType?.transcriptomics?.normalisedData || [];

  const result = [];

  normalisedData.forEach(geneExpressionEntry => {
    // Find the expressionData entry containing the specified sampleId
    const sampleData = geneExpressionEntry.expressionData.find(data => data.sampleId === sampleId);

    if (sampleData) {
      result.push({
        geneSymbol: geneExpressionEntry.geneSymbol,
        expression_value: sampleData.expression_value,
      });
    }
  });

  return result;
}

// Helper Functions

function getNormalisedDataForGene(geneSymbol) {
  const normalisedData = cptacData.geneExpression.assayType.normalisedData.find(
    (gene) => gene.geneSymbol === geneSymbol
  );

  return normalisedData ? normalisedData.expressionData : [];
}

// Function to categorize age into groups
function getAgeGroup(age) {
const lowerBound = Math.floor(age / 10) * 10;
const upperBound = lowerBound + 9;
return `${lowerBound}-${upperBound}`;
}


function calculateAverageAgeDonor(donors) {
if (donors.length === 0) {
  return null;
}

const totalAge = donors.reduce((sum, donor) => sum + donor.age, 0);
return totalAge / donors.length;
}

function findMostCommonElement(arr) {
if (arr.length === 0) {
  return null;
}

const counts = {};
let maxCount = 0;
let mostCommonElement = arr[0];

for (const element of arr) {
  counts[element] = (counts[element] || 0) + 1;

  if (counts[element] > maxCount) {
    maxCount = counts[element];
    mostCommonElement = element;
  }
}

return mostCommonElement;
}

function getMostCommonItem(array) {
if (array.length === 0) return null;

const counts = {};
let maxCount = 0;
let mostCommonItem = null;

array.forEach((item) => {
  counts[item] = (counts[item] || 0) + 1;

  if (counts[item] > maxCount) {
    maxCount = counts[item];
    mostCommonItem = item;
  }
});

return mostCommonItem;
}
