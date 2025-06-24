import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { City, Country, LocationMaster, TaxMaster, TenureModel } from "../../models/master.model.js"
import cities from "../../utils/seeds/cities.js";
import countries from "../../utils/seeds/countries.js"
import pagination from "../../utils/pagination.js"
import { UserRole } from "../../models/userRole.model.js";
import { CategoryModel } from "../../models/categories.model.js";
import {Sessions} from "../../models/service.model.js";


// Create Tenure
const createTenure = asyncHandler(async (req, res) => {
  const { name, duration, description } = req.body;

  const requiredFields = { name, duration };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(new ApiError(400, `Missing required field: ${missingFields.join(", ")}`));
  }

  const existingTenure = await TenureModel.findOne({ name });
  if (existingTenure) {
    return res.status(409).json(new ApiError(409, "Tenure already exists"));
  }

  const createdTenure = await TenureModel.create({
    name,
    duration,
    description,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdTenure, "Tenure created successfully"));
});

// Get All Tenure
const getAllTenure = asyncHandler(async (req, res) => {
  const tenures = await TenureModel.find();
  return res
    .status(200)
    .json(new ApiResponse(200, tenures, "All tenures fetched successfully"));
});

// Get Single Tenure
const getSingleTenure = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const tenure = await TenureModel.findById(req.params.id);
  if (!tenure) {
    return res.status(404).json(new ApiError(404, "Tenure not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tenure, "Tenure fetched successfully"));
});

// Update Tenure
const updateTenure = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const { name, duration, description } = req.body;

  const updatedTenure = await TenureModel.findByIdAndUpdate(
    req.params.id,
    { name, duration, description, updated_by: req.user?._id },
    { new: true }
  );

  if (!updatedTenure) {
    return res.status(404).json(new ApiError(404, "Tenure not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTenure, "Tenure updated successfully"));
});

// Delete Tenure
const deleteTenure = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const deleted = await TenureModel.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json(new ApiError(404, "Tenure not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tenure deleted successfully"));
});





/////////////////////////////////////////////////////// Catagory ////////////////////////////////////////////////////////
// create Catagory
const createCategory = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const { cName, cLevel } = req.body;


  const requiredFields = { cName, cLevel };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  const existingCategory = await CategoryModel.findOne({ cName });
  if (existingCategory) {
    return res
      .status(409)
      .json(new ApiError(409, `Category is created already`));
  }

  const createdCategory = await CategoryModel.create({
    cName,
    cLevel,
  });
 console.log("createdCategory:",createdCategory);
 
  return res
    .status(201)
    .json(new ApiResponse(201, createdCategory, "Category created successfully"));
});
// get all Catagory
const getAllCategory = asyncHandler(async (req, res) => {
  const allCategories = await CategoryModel.find({});
  res.status(200).json(new ApiResponse(200, allCategories, "all Categories fetched successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const deleteCategory = await CategoryModel.findByIdAndDelete(req.params.id);

  if (!deleteCategory) {
    return res
    .status(404)
    .json(new ApiError(404, "Category not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Category deleted successfully"));
});

//update category
const updateCategory = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
      return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
      return res.status(400).json(new ApiError(400, "No data provided to update"))
  } 

  const { cName, cLevel } = req.body;

  const updatedCategory = await CategoryModel.findByIdAndUpdate(
    req.params.id,
    {
      cName,
      cLevel,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  if (!updatedCategory) {
    return res
    .status(404)
    .json(new ApiError(404, "Category not found"));
    
  }

  return res
    .status(200)
    .json(new ApiResponse(200,updatedCategory,"Category updated successfully")
    );
});

//get single category
const getSingleCategory = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const category = await CategoryModel.findById(req.params.id);

  if (!category) {
    return res.status(404).json(new ApiError(404, "Category not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category fetched successfully"));
});

/////////////////////////////////////////////////////// ROLE ////////////////////////////////////////////////////////
// Create role
const createRole = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const { name, role_id, active } = req.body;

  const requiredFields = { name, role_id };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  const existingRole = await UserRole.findOne({ role_id });
  if (existingRole) {
    return res
      .status(409)
      .json(new ApiError(409, `Role with role_id ${role_id} already exists`));
  }

  const createdRole = await UserRole.create({
    name,
    role_id,
    active,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdRole, "Role created successfully"));
});


// Update role
const updateRole = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const { name, role_id, active } = req.body;

  const updatedRole = await UserRole.findByIdAndUpdate(
    req.params.id,
    {
      name,
      role_id,
      active,
    },
    { new: true }
  );

  if (!updatedRole) {
    return res.status(404).json(new ApiError(404, "Role not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRole, "Role updated successfully"));
});


// get all Role
const getAllRole = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const { filter = {}, page, limit, sortOrder } = req.body;

  let searchCondition = {};

  if (search && search !== "undefined") {
    const regex = new RegExp(search, "i");
    searchCondition = {
      $or: [{ name: { $regex: regex } }],
    };
  }

  const combinedFilter = {
    ...filter,
    ...searchCondition,
  };

  const aggregations = [
    {
      $match: combinedFilter,
    },
  ];

  const { newOffset, newLimit, totalPages, totalCount, newSortOrder } =
    await pagination(UserRole, page, limit, sortOrder, aggregations);

  let allRoles = [];

  if (totalCount > 0) {
    allRoles = await UserRole.aggregate([
      ...aggregations,
      {
        $sort: { _id: newSortOrder },
      },
      {
        $skip: newOffset,
      },
      {
        $limit: newLimit,
      },
    ]).exec();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { allRoles, page, limit, totalPages, totalCount },
          "Cancellation Reason fetched successfully"
        )
      );
  } else {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { allRoles, page, limit, totalPages, totalCount },
          "Cancellation Reason not found"
        )
      );
  }
});


// Get role by id
const getRoleById = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const role = await UserRole.findById(req.params.id);

  if (!role) {
    return res.status(404).json(new ApiError(404, "Role not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, role, "Role fetched successfully"));
});


// Get all active permission
const getAllActiveRole = asyncHandler(async (req, res) => {
  const role = await UserRole.find({ active: true }).sort({ _id: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, role, "Role fetched successfully"));
});



///////////////////////////////////////////////////// COUNTRY /////////////////////////////////////////////////
// create country
const createCountry = asyncHandler(async (req, res) => {

  if (!Array.isArray(countries) || countries.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, "No countries provided"));
  }

  const createdCountry = await Country.create(countries);

  return res
    .status(201)
    .json(new ApiResponse(201, createdCountry, "Country created successfully")
    );
})


//UpdateCountry
const updateCountry = asyncHandler(async (req, res) => {
  const { countryId } = req.params;
  const updatedCountryData = req.body;

  if (!updatedCountryData || Object.keys(updatedCountryData).length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No data provided to update"));
  }

  const country = await Country.findById(countryId);

  if (!country) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Country not found"));
  }

  const updatedCountry = await Country.findByIdAndUpdate(
    countryId,
    updatedCountryData,
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCountry, "Country updated successfully"));
});


// get all country
const getAllCountry = asyncHandler(async (req, res) => {
  const allCountry = await Country.find();

  return res
    .status(200)
    .json(new ApiResponse(200, allCountry, "Country fetched successfully")
    );
});


// get Country by Id
const getCountryById = asyncHandler(async (req, res) => {

  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const country = await Country.findById(req.params.id);

  if (!country) {
    return res
      .status(404)
      .json(new ApiError(404, "Country not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, country, "Country fetched successfully")
    );
});


//deleteallcountry
const deleteAllCountry = asyncHandler(async (req, res) => {

  await Country.deleteMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All country deleted successfully"));
});



//////////////////////////////////////////////////////// CITY ////////////////////////////////////////////////////////
// createcity
const createCity = asyncHandler(async (req, res) => {

  if (!Array.isArray(cities) || cities.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, "No cities provided"));
  }

  const createdCity = await City.create(cities);

  return res
    .status(201)
    .json(new ApiResponse(201, createdCity, "City created successfully")
    );
})


//update city by city id
const updateCity = asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const updatedCityData = req.body;

  if (!cityId || cityId === "undefined") {
    return res.status(400).json(new ApiError(400, "City ID not provided"));
  }


  if (!updatedCityData || Object.keys(updatedCityData).length === 0) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const city = await City.findById(cityId);

  if (!city) {
    return res.status(404).json(new ApiError(404, "City not found"));
  }


  // Update the city data
  const updatedCity = await City.findByIdAndUpdate(
    cityId,
    updatedCityData,
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedCity, "City updated successfully")
  );
});


// get all City by country
const getAllCity = asyncHandler(async (req, res) => {

  if (req.params.countryId == "undefined" || !req.params.countryId) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }
  const allCity = await City.find({ country: req.params.countryId });

  return res
    .status(200)
    .json(new ApiResponse(200, allCity, "City fetched successfully")
    );
});


// get City by Id
const getCityById = asyncHandler(async (req, res) => {

  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const city = await City.findById(req.params.id);

  if (!city) {
    return res
      .status(404)
      .json(new ApiError(404, "City not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, city, "City fetched successfully")
    );
});


//deleteAllcities
const deleteAllCities = asyncHandler(async (req, res) => {

  await City.deleteMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All cities deleted successfully"));
});




/////////////////////////////////////////////////////// SERVICE ////////////////////////////////////////////////////////
// Create Sessions
const createSession = asyncHandler(async (req, res) => {
  const { categoryId, sessionName } = req.body;
  const imageLocalPath = req.file?.path;
console.log("req.body:",req.body);

 
  if (!categoryId||!sessionName) {
    return res
      .status(400)
      .json(new ApiError(400, `Missing or invalid fields: all fields are required`));
  }

  let image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error while uploading image"));
    }
    image = uploadedImage.url;
  }

  const session = await Sessions.create({
    categoryId,
    sessionName,
    image,
    created_by: req.user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, session, "Session created successfully"));
});



// Get getAllSessions
const getAllSessions = asyncHandler(async (req, res) => {
  const sessions = await Sessions.find().populate("categoryId");
  res.status(200).json(new ApiResponse(200, sessions, "Sessions fetched successfully"));
});



// Get Sessions by ID
const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json(new ApiError(400, "Session ID is required"));
  }

  const session = await Sessions.findById(id).populate("categoryId");
  if (!session) {
    return res.status(404).json(new ApiError(404, "Session not found"));
  }

  res.status(200).json(new ApiResponse(200, session, "Session fetched successfully"));
});



// Update Sessions
const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sessionName, categoryId } = req.body;
  const imageLocalPath = req.file?.path;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "Session ID not provided"));
  }

  if (!sessionName && !categoryId && !imageLocalPath) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const existingSession = await Sessions.findById(id);
  if (!existingSession) {
    return res.status(404).json(new ApiError(404, "Session not found"));
  }

  let image = existingSession.image;

  if (imageLocalPath) {
    try {
      if (existingSession.image) {
        await deleteFromCloudinary(existingSession.image);
      }

      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage?.url) {
        return res.status(400).json(new ApiError(400, "Image upload failed"));
      }

      image = uploadedImage.url;
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Image handling failed"));
    }
  }

  const updatedSession = await Sessions.findByIdAndUpdate(
    id,
    {
      sessionName: sessionName || existingSession.sessionName,
      categoryId: categoryId || existingSession.categoryId,
      image,
      updated_by: req.user._id
    },
    { new: true }
  );

  res.status(200).json(new ApiResponse(200, updatedSession, "Session updated successfully"));
});



// Delete Sessions
const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Sessions.findById(id);
  if (!session) {
    return res.status(404).json(new ApiError(404, "Session not found"));
  }

  if (session.image) {
    await deleteFromCloudinary(session.image);
  }

  await Sessions.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, null, "Session deleted successfully"));
});




////////////////////////////////////////////////////// BREED ////////////////////////////////////////////////////////
// CREATE Location Master
const createLocationMaster = asyncHandler(async (req, res) => {
  // console.log("location res:",req.body)
  const { streetName, country,pin,city,pinAddress, is_active } = req.body;

  if (!streetName) {
    return res.status(400).json(new ApiError(400, "Missing required field: streetName"));
  }

  const createdLocation = await LocationMaster.create({
    streetName,
    country,
    city,
    pin,
    pinAddress,
    is_active,
    created_by: req.user?._id,
  });

  return res.status(201).json(
    new ApiResponse(201, createdLocation, "Location Master created successfully")
  );
});

// UPDATE Location Master
const updateLocationMaster = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const { streetName, country,city,pin,pinAddress, is_active } = req.body;

  const updatedLocation = await LocationMaster.findByIdAndUpdate(
    req.params.id,
    {
      streetName,
      country,
      pinAddress,
      pin,
      city,
      is_active,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  if (!updatedLocation) {
    return res.status(404).json(new ApiError(404, "Location Master not found"));
  }

  return res.status(200).json(
    new ApiResponse(200, updatedLocation, "Location Master updated successfully")
  );
});

const getLocationsByCountryAndCity = asyncHandler(async (req, res) => {
  const { country, city } = req.query;

  if (!country) {
    return res
      .status(400)
      .json(new ApiError(400, "Country is required"));
  }

  const filter = {
    country: country,
  };

  if (city) {
    // Check if city is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(city)) {
      filter.city = city;
    } else {
      // Match city name case-insensitively
      filter.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }
  }

  const locations = await LocationMaster.find(filter)
    .populate("country")
    .exec();

  if (!locations.length) {
    return res
      .status(404)
      .json(new ApiError(404, "No locations found for the given criteria"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, locations, "Locations fetched successfully"));
});


// GET ALL Location Masters (with pagination)
const getAllLocationMasters = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  const { filter, page, limit, sortOrder } = req.body;

  if (filter?.country) {
    filter.country = new mongoose.Types.ObjectId(filter.country);
  }

  let searchCondition = {};
  if (search && search !== 'undefined') {
    const regex = new RegExp(search, 'i');
    searchCondition = {
      $or: [
        { name: { $regex: regex } },
        { 'Country.name': { $regex: regex } },
      ],
    };
  }

  const combinedFilter = {
    ...filter,
    ...searchCondition,
  };

  const aggregations = [
    {
      $lookup: {
        from: 'countries',
        localField: 'country',
        foreignField: '_id',
        as: 'Country',
      },
    },
    {
      $unwind: {
        path: '$Country',
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: combinedFilter },
  ];

  const { newOffset, newLimit, totalPages, totalCount, newSortOrder } =
    await pagination(LocationMaster, page, limit, sortOrder, aggregations);

  let allLocationMasters = [];

  if (totalCount > 0) {
    allLocationMasters = await LocationMaster.aggregate([
      ...aggregations,
      { $project: { country: 0 } },
      { $sort: { _id: newSortOrder } },
      { $skip: newOffset },
      { $limit: newLimit },
    ]).exec();
  }

  return res.status(200).json(
    new ApiResponse(200, { allLocationMasters, page, limit, totalPages, totalCount }, totalCount ? "Location Master fetched successfully" : "No Location Master found")
  );
});

// GET All Location Masters (no pagination)
const getAllLocations = asyncHandler(async (req, res) => {
  const allLocations = await LocationMaster.find().populate('country');
  return res.status(200).json(new ApiResponse(200, allLocations, "Locations fetched successfully"));
});

// GET Location Master by ID
const getLocationMasterById = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const location = await LocationMaster.findById(req.params.id).populate('country');

  if (!location) {
    return res.status(404).json(new ApiError(404, "Location Master not found"));
  }

  return res.status(200).json(new ApiResponse(200, location, "Location Master fetched successfully"));
});

// DELETE Location Master
const deleteLocationMaster = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const location = await LocationMaster.findByIdAndDelete(req.params.id);

  if (!location) {
    return res.status(404).json(new ApiError(404, "Location Master not found"));
  }

  return res.status(200).json(new ApiResponse(200, "Location Master deleted successfully"));
});





// create tax master
const createTaxMaster = asyncHandler(async (req, res) => {
  const { name, rate, country, is_active } = req.body;

  const requiredFields = {
    name, rate
  };
  
  const missingFields = Object.keys(requiredFields).filter(field => !requiredFields[field] || requiredFields[field] === 'undefined');
  
  if (missingFields.length > 0) {
    return res.status(400).json(new ApiError(400, `Missing required field: ${missingFields.join(', ')}`));
  }

  // if (country) {
  //   const countryExists = await Country.findById(country);
  //   if (!countryExists) {
  //     return res.status(404).json(new ApiError(404, "Country not found"));
  //   }
  // }

  const createdTaxMaster = await TaxMaster.create({
    name,
    rate,
    country,
    is_active,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdTaxMaster, "TaxMaster created successfully")
    );
});


// update Tax Master
const updateTaxMaster = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
      return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
      return res.status(400).json(new ApiError(400, "No data provided to update"))
  } 

  const { name, rate, country, is_active } = req.body;

  // if (country) {
  //   const countryExists = await Country.findById(country);
  //   if (!countryExists) {
  //     return res.status(404).json(new ApiError(404, "Country not found"));
  //   }
  // }

  const updatedTaxMaster = await TaxMaster.findByIdAndUpdate(
    req.params.id,
    {
      name,
      rate,
      country,
      is_active,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  if (!updatedTaxMaster) {
    return res
    .status(404)
    .json(new ApiError(404, "Tax Master not found"));
    
  }

  return res
    .status(200)
    .json(new ApiResponse(200,updatedTaxMaster,"Tax Master updated successfully")
    );
});


// get all Tax Master
const getAllTaxMaster = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  const { filter, page, limit, sortOrder } = req.body; 

  if (filter?.country) {
    filter.country = new mongoose.Types.ObjectId(filter.country);
  }

  let searchCondition = {};

  if (search && search !== 'undefined') {
    const regex = new RegExp(search, 'i');
    searchCondition = {
      $or: [
        { name: { $regex: regex } },              
        { rate: { $regex: regex } },
        { 'Country.name': { $regex: regex } } 
      ]
    };
  }

  const combinedFilter = {
    ...filter,
    ...searchCondition,
  };

  const aggregations = [
    {
      $lookup: {
        from: "countries", 
        localField: "country",
        foreignField: "_id",
        as: "Country",
      },
    },
    {
      $unwind: {
        path: '$Country',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combinedFilter  
    }
  ];

  const { newOffset, newLimit, totalPages, totalCount, newSortOrder } = await pagination(TaxMaster, page, limit, sortOrder, aggregations);

  let allTaxMaster = [];

  if (totalCount > 0) {
    allTaxMaster = await TaxMaster.aggregate([
      ...aggregations,
      {
        $project: {
          country: 0,
        }
      },
      {
        $sort: { _id: newSortOrder },
      },
      {
        $skip: newOffset,
      },
      {
        $limit: newLimit,
      },
    ]).exec();

    return res.status(200).json(new ApiResponse(200, { allTaxMaster, page, limit, totalPages, totalCount }, "Tax Master fetched successfully"));
  } else {
    return res.status(200).json(new ApiResponse(200, { allTaxMaster, page, limit, totalPages, totalCount }, "No Tax master found"));
  }

});


// get all tax without pagination
const getAllTax = asyncHandler(async (req, res) => {
  const allTax = await TaxMaster.find()
  .populate("country")

  return res
    .status(200).json(new ApiResponse(200, allTax, "Tax fetched successfully"));
});


// Get Tax Master by ID
const getTaxMasterById = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const taxMaster = await TaxMaster.findById(req.params.id).populate('country');

  if (!taxMaster) {
    return res
    .status(404)
    .json(new ApiError(404, "Tax master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, taxMaster, "Tax master fetched successfully")
    );
});


// delete tax master
const deleteTaxMaster = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const taxMaster = await TaxMaster.findByIdAndDelete(req.params.id);

  if (!taxMaster) {
    return res
    .status(404)
    .json(new ApiError(404, "Tax Master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tax Master deleted successfully"));
});




export {
  createLocationMaster,
updateLocationMaster,
getAllLocationMasters,
getAllLocations,
getLocationsByCountryAndCity,
getLocationMasterById,
deleteLocationMaster,

   createTenure,
  getAllTenure,
  getSingleTenure,
  updateTenure,
  deleteTenure,
  createSession,
getAllSessions,
getSessionById,
updateSession,
deleteSession,
  createCategory,
  getAllCategory,
  deleteCategory,
  updateCategory,
  getSingleCategory,
  createRole,
  updateRole,
  // getRoleById,
  getAllRole,
  getAllActiveRole, 

   createTaxMaster,
  updateTaxMaster,
  getAllTaxMaster,
  getAllTax,
  getTaxMasterById,
  deleteTaxMaster,

  createCountry,
  updateCountry,
  getAllCountry,
  getCountryById,
  deleteAllCountry,

  createCity,
  updateCity,
  getAllCity,
  getCityById,
  deleteAllCities,

  // createServiceType,
  // getAllServiceTypes,
  // getServiceTypeById,
  // updateServiceType,
  // deleteServiceType,

  // createBreed,
  // updateBreed,
  // getBreedById,
  // getAllBreed,
  // deleteBreed,

  // createPetType,
  // updatePetType,
  // getPetType,
  // getAllPetTypes,
  // deletePetType,

 

  // createExtraCharge,
  // updateExtraCharge,
  // getExtraChargeById,
  // getAllExtraCharges,
  // deleteExtraCharge,

  // createVaccine,
  // getAllVaccines,
  // getVaccineById,
  // updateVaccine,
  // deleteVaccine
};